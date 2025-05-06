const express = require('express');
const router = express.Router();
const { WebClient } = require('@slack/web-api');
const slackService = require('../services/slackService');

// created a slack client using the bot token in slack api
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Here created a route that handles the slash command to trigger the approval modal
router.post('/commands', async (req, res) => {
    const { trigger_id } = req.body;

    try {
        //Here we get list of slack users to populate the dropdown
        const users = await slackService.getUsers();
        const userOptions = users.map(u => ({
            text: {
                type: "plain_text",
                text: u.name,
                emoji: true
            },
            value: u.id
        }));

        //Here I have defined the modal view for the approval request
        const modal = {
            type: "modal",
            callback_id: "approval_modal",
            title: {
                type: "plain_text",
                text: "Approval Request"
            },
            submit: {
                type: "plain_text",
                text: "Submit"
            },
            blocks: [
                {
                    type: "input",
                    block_id: "approver",
                    element: {
                        type: "static_select",
                        placeholder: {
                            type: "plain_text",
                            text: "Select a user"
                        },
                        options: userOptions,
                        action_id: "selected_user"
                    },
                    label: {
                        type: "plain_text",
                        text: "Approver"
                    }
                },
                {
                    type: "input",
                    block_id: "message",
                    element: {
                        type: "plain_text_input",
                        multiline: true,
                        action_id: "approval_text"
                    },
                    label: {
                        type: "plain_text",
                        text: "Approval Message"
                    }
                }
            ]
        };

        //Open the modal for the user
        await slackClient.views.open({
            trigger_id,
            view: modal
        });

        res.status(200).send();
    } catch (error) {
        console.error("Error in /commands endpoint:", error);
        res.status(500).send("Internal Server Error");
    }
});

router.post('/interactions', async (req, res) => {
    const payload = JSON.parse(req.body.payload);
    console.log("Payload:", payload);

    try {
        // code for when the user sumits the approval modal 
        if (payload.type === 'view_submission') {
            const approver = payload.view.state.values.approver.selected_user.selected_option?.value;
            const message = payload.view.state.values.message.approval_text?.value;
            const requester = payload.user.id;

            if (!approver || !message) {
                console.error('Missing required fields: approver or message');
                return res.status(400).send('Missing required fields.');
            }

            // send a message to the approver 
            await slackService.sendApprovalMessage(approver, message, requester);
            return res.send({ response_action: 'clear' });
        }

        //code for when the Approver clicks on Approve or Reject Buttons
        if (payload.type === 'block_actions') {
            const action = payload.actions[0];


            console.log("Message:", payload.message);

            //code for check if message contains blocks and find the requester
            if (payload.message && payload.message.blocks) {
                const requesterBlock = payload.message.blocks
                    .find(block => block.type === 'context');

                if (requesterBlock) {
                    const requester = requesterBlock.elements[0].text.split(': ')[1];
                    const response = action.text.text;

                    //code for Notify Requester  of the decision
                    await slackService.notifyRequester(requester, response);
                    return res.status(200).send();
                } else {
                    console.error('Context block not found.');
                    return res.status(400).send('Context block missing in message.');
                }
            } else {
                console.error('Blocks missing in message.');
                return res.status(400).send('Blocks missing in message.');
            }
        }

        res.status(400).send('Invalid payload type.');
    } catch (error) {
        console.error("Error in /interactions endpoint:", error);
        res.status(500).send("Internal Server Error");
    }
});

module.exports = router;

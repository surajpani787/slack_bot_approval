const { WebClient } = require('@slack/web-api');
const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

module.exports = {
    //Here this code  function gets a list of all Slack users and filters out bots and the default Slackbot
    getUsers: async () => {
        try {
            const res = await slackClient.users.list();
            return res.members.filter(user => !user.is_bot && user.id !== 'USLACKBOT');
        } catch (error) {
            console.error("Error getting users:", error);
            throw new Error("Failed to fetch users.");
        }
    },

    // Here this function sends the approval message to the selected approver
    sendApprovalMessage: async (approverId, message, requesterId) => {
        try {
            await slackClient.chat.postMessage({
                channel: approverId,
                text: "Approval Request",
                metadata: {
                    requester: requesterId
                },
                blocks: [
                    {
                        type: "section",
                        text: {
                            type: "mrkdwn",
                            text: `*Approval Request:*\n${message}`
                        }
                    },
                    {
                        type: "actions",
                        elements: [
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Approve"
                                },
                                style: "primary",
                                action_id: "approve"
                            },
                            {
                                type: "button",
                                text: {
                                    type: "plain_text",
                                    text: "Reject"
                                },
                                style: "danger",
                                action_id: "reject"
                            }
                        ]
                    },
                    {
                        type: "context",
                        elements: [
                            {
                                type: "plain_text",
                                text: `Requester ID: ${requesterId}`,
                                emoji: true
                            }
                        ]
                    }
                ]
            });
        } catch (error) {
            console.error("Error sending approval message:", error);
            throw new Error("Failed to send approval message.");
        }
    },

    notifyRequester: async (requesterId, response) => {
        try {
            await slackClient.chat.postMessage({
                channel: requesterId,
                text: `Your approval was *${response.toLowerCase()}*`
            });
        } catch (error) {
            console.error("Error notifying requester:", error);
            throw new Error("Failed to notify requester.");
        }
    }
};

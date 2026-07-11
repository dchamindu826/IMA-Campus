const fs = require('fs');

let ls = fs.readFileSync('src/screens/LiveScreen.jsx', 'utf8');

const scheduleFn = `
  const scheduleNotifications = async (classes) => {
    try {
        await notifee.requestPermission();
        await notifee.createChannel({ id: 'live_reminders', name: 'Live Class Reminders', importance: AndroidImportance.HIGH, sound: 'default' });

        const scheduledIds = await notifee.getTriggerNotificationIds();
        const now = Date.now();

        for (const item of classes) {
            let timeStr = item.startTime;
            if (timeStr && timeStr.split(':').length === 2) {
                timeStr += ':00';
            }
            
            const classDateTime = new Date(\`\${item.date}T\${timeStr}\`);
            const notifyTime = classDateTime.getTime() - (15 * 60 * 1000); // 15 mins before

            if (notifyTime > now) {
                const notifId = \`live_\${item.id}\`;
                if (!scheduledIds.includes(notifId)) {
                    await notifee.createTriggerNotification(
                        {
                            id: notifId,
                            title: 'Live Class Starting Soon! 🔴',
                            body: \`\${item.title || item.name || 'Your class'} will start in 15 minutes. Get ready!\`,
                            android: { channelId: 'live_reminders', pressAction: { id: 'default' } }
                        },
                        { type: TriggerType.TIMESTAMP, timestamp: notifyTime }
                    );
                }
            }
        }
    } catch (error) { console.error("Notification Error:", error); }
  };
`;

// Inject function
ls = ls.replace('  const fetchLives = async () => {', scheduleFn + '\n  const fetchLives = async () => {');

// Call function inside fetchLives
ls = ls.replace('// scheduleNotifications removed as backend handles it now', 'scheduleNotifications(fetchedLives);');

fs.writeFileSync('src/screens/LiveScreen.jsx', ls);
console.log("Restored scheduleNotifications in LiveScreen");

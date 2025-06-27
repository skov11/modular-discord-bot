# Purge Plugin (`/purge`)

A comprehensive message management system with manual purge commands and automated scheduling capabilities for Discord server maintenance.

## Features

- **Manual Message Purging**: Delete specific number of messages (1-100) or all messages from channels
- **Channel Selection**: Target any channel with proper permissions, defaults to current channel
- **Bulk Delete Optimization**: Handles Discord's 14-day bulk delete limitation automatically
- **Auto-Purge Scheduling**: Configurable cron-based automatic message deletion
- **Multiple Schedules**: Set up different purge schedules for different channels
- **Timezone Support**: Configure schedules with specific timezones (UTC, EST, PST, etc.)
- **Rate Limit Handling**: Intelligent delays to avoid Discord API rate limits
- **Permission Checks**: Automatic validation of bot and user permissions before execution
- **Comprehensive Logging**: All purge actions logged with timestamps and user information
- **Discord Integration**: Optional logging of purge activities to designated Discord channels
- **Hot-Configuration**: All purge settings configurable through web UI with immediate effect

## Configuration

### Example Configuration

```json
{
  "purge": {
    "enabled": true,
    "logging": {
      "channelId": "channel_for_purge_logs"
    },
    "autoPurge": {
      "enabled": true,
      "schedules": [
        {
          "enabled": true,
          "name": "Daily Cleanup",
          "channelId": "channel_to_purge_daily",
          "messageCount": 100,
          "cron": "0 0 * * *",
          "timezone": "America/New_York"
        },
        {
          "enabled": false,
          "name": "Weekly Full Purge",
          "channelId": "channel_to_purge_weekly",
          "messageCount": 0,
          "cron": "0 0 * * 0",
          "timezone": "UTC"
        }
      ]
    }
  }
}
```

### Configuration Options

#### Auto-Purge Schedules

- **enabled**: Whether this specific schedule is active
- **name**: Descriptive name for the schedule
- **channelId**: Target channel for purging
- **messageCount**: Number of messages to delete (0 = all messages)
- **cron**: Cron expression for scheduling
- **timezone**: Timezone for the schedule (optional, defaults to server timezone)

#### Message Count Options

- `0` - Delete all messages in the channel
- `1-1000` - Delete specific number of recent messages

## Usage

### Manual Purge Commands

#### Basic Usage
```
/purge count:50
```
Deletes 50 recent messages from current channel

#### All Messages
```
/purge count:0
```
Deletes all messages from current channel

#### Target Specific Channel
```
/purge count:25 channel:#general
```
Deletes 25 messages from #general channel

#### With Reason
```
/purge count:10 reason:Cleanup spam
```
Adds reason to logs for audit trail

### Auto-Purge Configuration

#### Through Web UI

1. **Access Web UI**: Navigate to Purge Plugin section in dashboard
2. **Enable Auto-Purge**: Toggle the auto-purge option
3. **Add Schedules**: Click "Add Schedule" to create new automated purge tasks
4. **Configure Schedule**:
   - **Name**: Descriptive name for the schedule (e.g., "Daily Cleanup")
   - **Channel**: Select target channel from dropdown
   - **Message Count**: 0 for all messages, or specific number (1-1000)
   - **Cron Schedule**: Use cron expressions
   - **Timezone**: Select appropriate timezone for scheduling

#### Cron Schedule Examples

| Expression | Description |
|------------|-------------|
| `0 0 * * *` | Daily at midnight |
| `0 0 * * 0` | Weekly on Sunday at midnight |
| `0 2 * * *` | Daily at 2:00 AM |
| `0 0 1 * *` | Monthly on the 1st at midnight |
| `0 */6 * * *` | Every 6 hours |
| `0 0 * * 1-5` | Weekdays only at midnight |
| `30 1 * * *` | Daily at 1:30 AM |

**Cron Expression Format**: `minute hour day month day-of-week`

Use [crontab.guru](https://crontab.guru/) for help creating cron expressions.

#### Timezone Support

Available timezones include:
- `UTC` - Coordinated Universal Time
- `America/New_York` - Eastern Time
- `America/Chicago` - Central Time
- `America/Denver` - Mountain Time
- `America/Los_Angeles` - Pacific Time
- `Europe/London` - Greenwich Mean Time
- `Europe/Paris` - Central European Time
- `Asia/Tokyo` - Japan Standard Time
- And more...

## Technical Details

### Discord API Limitations

The plugin automatically handles Discord's limitations:

- **14-Day Rule**: Messages older than 14 days cannot be bulk deleted and are deleted individually
- **Rate Limits**: Automatic delays between operations to avoid API rate limits
- **Bulk Delete Limit**: Maximum 100 messages per bulk delete operation

### Delete Process

1. **Permission Check**: Validates bot and user permissions
2. **Message Fetching**: Retrieves messages in batches of up to 100
3. **Age Separation**: Separates recent messages (bulk deletable) from old messages
4. **Bulk Delete**: Uses Discord's bulk delete for recent messages
5. **Individual Delete**: Deletes old messages one by one with delays
6. **Logging**: Records all operations with timestamps and counts

### Rate Limit Handling

- **Bulk Operations**: 1-2 second delays between bulk delete operations
- **Individual Deletes**: 1 second delay between each old message deletion
- **Large Purges**: Progressive delays for very large message counts
- **Graceful Degradation**: Continues operation even if some deletions fail

## Logging

### File Logging (`bot.log`)

All purge events are logged with `[PURGE]` prefix:
- 🗑️ Manual purge operations with user, channel, and count
- 🕐 Auto-purge executions with schedule name and results
- ⚠️ Permission errors and failures
- 🔍 Debug information for troubleshooting

### Discord Channel Logging

When configured, the following events are sent to the Discord log channel:
- 🗑️ **Manual Purges**: `User purged X messages from #channel. Reason: reason`
- 🕐 **Auto-Purges**: `Auto-purge 'Schedule Name' completed: X messages deleted from #channel`
- ⚠️ **Failures**: `Auto-purge failed for #channel: error message`

## Web Interface Configuration

The purge plugin can be fully configured through the web dashboard:

1. **Logging Channel**: Visual dropdown selection for purge log destination
2. **Auto-Purge Toggle**: Enable/disable automatic purging
3. **Schedule Management**:
   - Add/remove schedules dynamically
   - Visual channel selection dropdowns
   - Timezone dropdown with popular options
   - Cron expression validation help
4. **Real-time Updates**: Changes take effect immediately without restart

## Permissions Required

### Bot Permissions

- **Manage Messages**: Required in all target channels for deleting messages
- **Read Message History**: To fetch messages for deletion
- **Send Messages**: To send confirmation and error messages
- **Embed Links**: For formatted log messages (if using Discord logging)

### User Permissions

- **Manage Messages**: Required to use the `/purge` command
- Users without this permission will receive an error message

### Channel Permissions

The bot must have `Manage Messages` permission in:
- All channels where manual purging will be used
- All channels configured for auto-purge schedules
- The logging channel (if Discord logging is enabled)

## Security Considerations

- **Permission Validation**: Bot checks permissions before executing any purge operation
- **User Authorization**: Only users with `Manage Messages` can use purge commands
- **Audit Trail**: All operations are logged with user information and timestamps
- **Graceful Failures**: Operations fail safely without affecting other bot functions
- **Rate Limit Compliance**: Respects Discord's API limits to prevent service disruption

## Example Use Cases

### Daily Channel Maintenance
```json
{
  "name": "Daily General Cleanup",
  "channelId": "general_channel_id",
  "messageCount": 50,
  "cron": "0 2 * * *",
  "timezone": "America/New_York"
}
```

### Weekly Full Reset
```json
{
  "name": "Weekly Bot Commands Reset",
  "channelId": "bot_commands_channel_id", 
  "messageCount": 0,
  "cron": "0 0 * * 0",
  "timezone": "UTC"
}
```

### Business Hours Cleanup
```json
{
  "name": "End of Day Cleanup",
  "channelId": "temp_channel_id",
  "messageCount": 100,
  "cron": "0 18 * * 1-5",
  "timezone": "America/Los_Angeles"
}
```
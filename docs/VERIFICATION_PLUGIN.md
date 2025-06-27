# Verification Plugin (`/verify`)

A comprehensive user verification system for Discord servers with configurable screenshot requirements, admin approval workflows, and automated moderation.

> **Note**: This verification plugin was originally forked from [discord-verification-bot](https://github.com/Zachdidit/discord-verification-bot) and has been extensively enhanced and integrated into the modular framework.

## Features

- **Flexible Screenshot Requirements**: Support for 0, 1, or 2 screenshots based on configuration
- **Dynamic Field Requirements**: Configure character and guild names as required or optional independently
- **Real-time Command Updates**: Verification command structure updates immediately when settings change
- **Image Validation**: Automatic validation to ensure uploads are valid image files (PNG, JPG, GIF, WebP)
- **Enhanced Display System**: Multi-embed display showing screenshots clearly in verification channels
- **Admin Approval System**: Interactive approval/denial buttons with comprehensive admin controls
- **Verification Denial System**: Moderators can deny requests with mandatory reason documentation
- **Resubmission Control**: Denied users must resubmit verification before being eligible for approval
- **Role-Based Permissions**: Only users with specified roles can approve verifications
- **Duplicate Prevention**: Prevents users from submitting multiple verification requests
- **Auto-Response System**: Automatically guides users who send non-command messages to use `/verify`
- **Channel Auto-Moderation**: Automatically deletes non-command messages to keep verification channels clean
- **Smart DM Fallback**: Sends private DMs to users with public reply fallback if DMs are disabled
- **Comprehensive Logging**: Records verification events to both file system and Discord channels
- **Hot-Configuration**: All verification settings can be changed through the web UI without restart
- **Visual Interface**: Channel and role dropdowns with color indicators and organized by category

## Configuration

### Example Configuration

```json
{
  "verification": {
    "enabled": true,
    "channels": {
      "verifyChannelId": "channel_for_verification_requests",
      "verifyCommandChannelId": "channel_where_users_use_verify_command",
      "logChannelId": "channel_for_logs",
      "howToVerifyID": "channel_with_verification_instructions"
    },
    "roles": {
      "verifiedRoleId": "role_to_assign_verified_users",
      "verifierRoleIds": ["admin_role_id_1", "admin_role_id_2"]
    },
    "messages": {
      "approvalMessage": "✅ Thank you for verifying! You have been approved.",
      "denialMessagePrefix": "❌ Your verification has been denied."
    },
    "settings": {
      "debugMode": true,
      "screenshotCount": 2,
      "requireCharacterName": true,
      "requireGuildName": true
    }
  }
}
```

### Configuration Options

#### Screenshot Requirements (`screenshotCount`)

- `0` - No screenshots required (text-only verification)
- `1` - Single screenshot required
- `2` - Dual screenshots required (default)

#### Field Requirements

- `requireCharacterName` - Whether character name is required (default: `true`)
- `requireGuildName` - Whether guild name is required (default: `true`)

#### Example Configurations

**Gaming server with full verification:**
```json
"settings": {
  "screenshotCount": 2,
  "requireCharacterName": true,
  "requireGuildName": true
}
```

**Simple verification with minimal requirements:**
```json
"settings": {
  "screenshotCount": 0,
  "requireCharacterName": false,
  "requireGuildName": false
}
```

**Single screenshot with character name only:**
```json
"settings": {
  "screenshotCount": 1,
  "requireCharacterName": true,
  "requireGuildName": false
}
```

## Usage

### For Users

1. Use `/verify` command in the designated verification channel
2. **Upload screenshots** as proof of verification (based on server configuration)
   - **Screenshot 1**: Primary verification image showing character and guild
   - **Screenshot 2**: Additional verification image for enhanced security (if required)
3. Provide your character name and guild name (if required)
4. Wait for admin approval
5. **Note**: Any non-command messages in the verification channel will be automatically deleted and you'll receive a private DM with guidance

### For Admins

1. Monitor verification requests in the designated channel
2. **Review screenshots** displayed in the verification embed(s)
3. Click "Approve Verification" button to approve users or "Deny Verification" to deny with reason
4. When denying, provide a mandatory reason in the popup modal
5. Check logs in the log channel or bot logs
6. Monitor auto-moderation events in the log channel

**Note**: Denied users must resubmit their verification before they can be approved.

### Supported Image Formats

- PNG (.png)
- JPEG/JPG (.jpg, .jpeg)
- GIF (.gif)
- WebP (.webp)

## Auto-Moderation Features

### Message Guidance System

- **Trigger**: When users send any message that isn't `/verify` in the verification channel
- **Response**: Bot sends a private DM with guidance to use `/verify` command
- **Fallback**: If DM fails (user has DMs disabled), sends a public reply
- **Auto-Delete**: Original message is automatically deleted to keep channel clean

### Screenshot Validation

- **File Type Checking**: Automatically validates that uploads are valid image files
- **Supported Formats**: PNG, JPG/JPEG, GIF, WebP
- **Error Handling**: Clear error messages for invalid file types
- **Enhanced Display**: Multiple embeds showing screenshots with clear labeling

#### Example Auto-Moderation Flow

1. User types: "How do I get verified?"
2. Bot sends private DM: "Please use the /verify command to begin the verification process. Check out the instructions in #how-to-verify."
3. Bot deletes the original message
4. Channel stays clean and organized

#### Example Verification Flow

1. User runs: `/verify character:PlayerName guild:GuildName screenshot1:[image1] screenshot2:[image2]`
2. Bot validates images are valid formats
3. Bot creates multi-embed display showing screenshots
4. Admins can review images before making approval decision

## Logging

### File Logging (`bot.log`)

All verification events are logged with `[VERIFICATION]` prefix:
- ✅ Successful verification approvals
- ❌ Verification denials with reasons
- 📝 Nickname updates (success/failure)
- 💌 DM delivery status (success/failure)
- 🔍 Debug information (when debug mode enabled)
- ⚠️ Configuration warnings and errors

### Discord Channel Logging

Only specific events are sent to the Discord log channel:
- ✅ **Verification approvals**: `AdminName verified UserName at [timestamp]`
- ❌ **Verification denials**: `@Admin denied verification for @User. Reason: [reason]`
- ⚠️ **DM delivery failures**: `Failed to send denial DM to @User - user may have DMs disabled`

## Web Interface Configuration

The verification plugin can be fully configured through the web dashboard:

1. **Channels**: Visual dropdown selection of Discord channels
2. **Roles**: 
   - Single dropdown for verified role
   - Multi-select dropdown for verifier roles with color indicators
3. **Settings**: Screenshot count, field requirements, debug mode
4. **Messages**: Customizable approval and denial messages
5. **Real-time Updates**: Changes take effect immediately without restart

## Permissions Required

### Bot Permissions

- **Send Messages**: To send verification responses and guidance
- **Embed Links**: To display verification embeds with screenshots
- **Manage Roles**: To assign verified role to approved users
- **Manage Nicknames**: For automatic nickname updates (optional)
- **Manage Messages**: For auto-deletion of non-command messages
- **Read Message History**: To process verification requests
- **Use Application Commands**: To register and use slash commands

### User Permissions

- **Verifier Roles**: Users with configured verifier roles can approve/deny verifications
- **General Users**: No special permissions required to submit verification requests
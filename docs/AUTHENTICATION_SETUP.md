# Discord OAuth2 Authentication Setup

This guide will help you set up Discord OAuth2 authentication for the bot management UI.

## Step 1: Configure Discord Application

1. **Go to Discord Developer Portal**
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Select your existing bot application

2. **Configure OAuth2 Settings**
   - Go to "OAuth2" → "General" in the sidebar
   - Add a redirect URL: `http://localhost:3000/auth/discord/callback`
   - For production, use your domain: `https://yourdomain.com/auth/discord/callback`

3. **Get Client Secret**
   - In the "OAuth2" → "General" section
   - Click "Reset Secret" to generate a new client secret
   - **Copy this secret immediately** - you won't be able to see it again

4. **Set Required Scopes**
   - The application automatically requests these scopes:
     - `identify` - Get basic user info
     - `guilds.members.read` - Read user's guild member info

## Step 2: Update Configuration

Update your `config.json` file with the authentication settings:

```json
{
  "bot": {
    "token": "your_bot_token",
    "clientId": "your_client_id",
    "guildId": "your_guild_id",
    "enableUI": true,
    "uiPort": 3000,
    "uiAuth": {
      "enabled": true,
      "clientSecret": "your_discord_client_secret_here",
      "sessionSecret": "a_random_string_for_session_security",
      "allowedRoleIds": [
        "role_id_1",
        "role_id_2"
      ],
      "redirectUri": "http://localhost:3000/auth/discord/callback"
    }
  }
}
```

### Configuration Options

- **`enabled`**: Set to `true` to enable authentication, `false` to disable
- **`clientSecret`**: Your Discord application's client secret
- **`sessionSecret`**: A random string used to sign session cookies (generate a secure random string)
- **`allowedRoleIds`**: Array of Discord role IDs that can access the UI
- **`redirectUri`**: Must match the redirect URI in your Discord application

## Step 3: Generate Session Secret

Generate a secure random string for the session secret:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use any password generator for a 64+ character string
```

## Step 4: Get Role IDs

To find role IDs in Discord:

1. **Enable Developer Mode**
   - Discord Settings → Advanced → Developer Mode (ON)

2. **Get Role ID**
   - Right-click on a role in your server
   - Select "Copy Role ID"
   - Add the ID to the `allowedRoleIds` array

## Step 5: Install Dependencies

```bash
npm install
```

The authentication system uses these additional packages:
- `express-session` - Session management
- `passport` - Authentication middleware
- `passport-discord` - Discord OAuth2 strategy
- `axios` - HTTP requests to Discord API

## Step 6: Test Authentication

1. **Start the bot**:
   ```bash
   node index.js
   ```

2. **Access the UI**:
   - Go to `http://localhost:3000`
   - You should be redirected to the login page
   - Click "Continue with Discord"
   - Authorize the application
   - You'll be redirected back to the dashboard if you have the required roles

## Security Notes

- **Never commit secrets to version control**
- **Use environment variables in production**:
  ```bash
  export DISCORD_CLIENT_SECRET="your_secret_here"
  export SESSION_SECRET="your_session_secret_here"
  ```
- **Use HTTPS in production** and set `cookie.secure: true`
- **Regularly rotate your client secret**

## Troubleshooting

### "Access denied" error
- Check that your Discord user has one of the roles specified in `allowedRoleIds`
- Verify the role IDs are correct
- Ensure you're a member of the configured guild

### "Authentication failed" error
- Check that `clientSecret` is correct
- Verify the `redirectUri` matches your Discord application settings
- Check the console logs for detailed error messages

### "Not found in Discord server" error
- Ensure the bot and user are both in the same Discord server
- Check that `guildId` is correct

## Disabling Authentication

To disable authentication and make the UI publicly accessible:

```json
{
  "bot": {
    "uiAuth": {
      "enabled": false
    }
  }
}
```

Or remove the `uiAuth` section entirely.

## Production Deployment

For production deployment:

1. **Use HTTPS**: Update `redirectUri` to use `https://`
2. **Secure Cookies**: Set `cookie.secure: true` in session config
3. **Environment Variables**: Use environment variables for secrets
4. **Firewall**: Restrict access to the UI port if not using authentication
5. **Regular Updates**: Keep dependencies updated for security patches
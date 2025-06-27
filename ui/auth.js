const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const axios = require('axios');

class AuthManager {
    constructor(config, botInstance) {
        this.config = config;
        this.botInstance = botInstance;
        this.setupPassport();
    }

    setupPassport() {
        if (!this.config.uiAuth?.enabled) return;

        passport.use(new DiscordStrategy({
            clientID: this.config.clientId,
            clientSecret: this.config.uiAuth.clientSecret,
            callbackURL: this.config.uiAuth.redirectUri,
            scope: ['identify', 'guilds.members.read']
        }, async (accessToken, refreshToken, profile, done) => {
            try {
                // Get user's roles in the specified guild
                const member = await this.getUserGuildMember(profile.id, accessToken);
                
                if (!member) {
                    return done(null, false, { message: 'User not found in the Discord server' });
                }

                // Check if user has any of the allowed roles
                const hasAllowedRole = this.config.uiAuth.allowedRoleIds.some(roleId => 
                    member.roles.includes(roleId)
                );

                if (!hasAllowedRole) {
                    return done(null, false, { message: 'Insufficient permissions' });
                }

                // User is authorized
                const user = {
                    id: profile.id,
                    username: profile.username,
                    discriminator: profile.discriminator,
                    avatar: profile.avatar,
                    roles: member.roles,
                    accessToken: accessToken
                };

                return done(null, user);
            } catch (error) {
                console.error('[UI Auth] Error during authentication:', error);
                return done(error);
            }
        }));

        passport.serializeUser((user, done) => {
            done(null, user);
        });

        passport.deserializeUser((user, done) => {
            done(null, user);
        });
    }

    async getUserGuildMember(userId, accessToken) {
        try {
            const response = await axios.get(
                `https://discord.com/api/v10/users/@me/guilds/${this.config.guildId}/member`,
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );
            return response.data;
        } catch (error) {
            console.error('[UI Auth] Error fetching guild member:', error.response?.data || error.message);
            return null;
        }
    }

    requireAuth(req, res, next) {
        if (!this.config.uiAuth?.enabled) {
            return next(); // Authentication disabled, allow access
        }

        if (req.isAuthenticated()) {
            return next();
        }

        // Store the original URL for redirect after login
        req.session.returnTo = req.originalUrl;
        res.redirect('/auth/login');
    }

    setupRoutes(app) {
        if (!this.config.uiAuth?.enabled) return;

        // Initialize passport
        app.use(passport.initialize());
        app.use(passport.session());

        // Login page
        app.get('/auth/login', (req, res) => {
            res.render('login', { 
                title: 'Bot Management - Login',
                error: req.query.error 
            });
        });

        // Discord OAuth2 login
        app.get('/auth/discord', passport.authenticate('discord'));

        // Discord OAuth2 callback
        app.get('/auth/discord/callback', 
            passport.authenticate('discord', { 
                failureRedirect: '/auth/login?error=access_denied' 
            }),
            (req, res) => {
                const returnTo = req.session.returnTo || '/';
                delete req.session.returnTo;
                res.redirect(returnTo);
            }
        );

        // Logout
        app.get('/auth/logout', (req, res) => {
            req.logout((err) => {
                if (err) {
                    console.error('[UI Auth] Logout error:', err);
                }
                res.redirect('/auth/login');
            });
        });

        // User info API
        app.get('/api/auth/user', this.requireAuth.bind(this), (req, res) => {
            if (req.user) {
                res.json({
                    id: req.user.id,
                    username: req.user.username,
                    discriminator: req.user.discriminator,
                    avatar: req.user.avatar
                });
            } else {
                res.status(401).json({ error: 'Not authenticated' });
            }
        });
    }

    getRoleNames(roleIds) {
        if (!this.botInstance?.client?.guilds) return [];
        
        const guild = this.botInstance.client.guilds.cache.get(this.config.guildId);
        if (!guild) return [];

        return roleIds.map(roleId => {
            const role = guild.roles.cache.get(roleId);
            return role ? role.name : `Unknown Role (${roleId})`;
        });
    }
}

module.exports = AuthManager;
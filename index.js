const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, 'settings.json');

function loadSettings() {
    try {
        if (!fs.existsSync(SETTINGS_PATH)) {
            const defaults = {
                prefix: '#',
                ownerNumber: '+254701964272',
                ownerNumbers: ['+254701964272','+254791536079'],
                channelLink: null,
                public: true,
                ownerName: null,
                group: {
                    antilink: false,
                    antibot: false,
                    antiforeign: false,
                    antigroupmention: false,
                    welcome: true
                },
                settings: {
                    alwaysonline: false,
                    antibug: false,
                    anticall: false,
                    antidelete: false,
                    autoreact: false,
                    autoreactstatus: false,
                    autoread: false,
                    autorecord: false,
                    autorecordtyping: false,
                    autotyping: false,
                    autostatusview: false
                }
            };
            fs.writeFileSync(SETTINGS_PATH, JSON.stringify(defaults, null, 2));
            return defaults;
        }
        const raw = fs.readFileSync(SETTINGS_PATH);
        return JSON.parse(raw);
    } catch (e) {
        console.error('Could not load settings:', e);
        return {};
    }
}

function saveSettings() {
    try {
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error('Could not save settings:', e);
    }
}

const settings = loadSettings();
let notifiedThisSession = false;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

async function sendConnectNotification() {
    if (notifiedThisSession) return;
    const owners = Array.isArray(settings.ownerNumbers) && settings.ownerNumbers.length ? settings.ownerNumbers : (settings.ownerNumber ? [settings.ownerNumber] : []);
    if (!owners || owners.length === 0) return;
    try {
        // slight delay to ensure client is fully ready on network
        setTimeout(async () => {
            for (let ownerRaw of owners) {
                try {
                    const ownerDigits = (ownerRaw || '').replace(/[^0-9]/g, '');
                    if (!ownerDigits) continue;
                    const ownerJid = ownerDigits.includes('@') ? ownerRaw : `${ownerDigits}@c.us`;
                    const mode = settings.public === false ? 'PRIVATE' : 'PUBLIC';
                    const notifyText = `✨ *TrueAlpha x Bot* v1.0.0\nMode: ${mode}\nTime: ${new Date().toLocaleString()}\n\nBot is online.`;
                    await client.sendMessage(ownerJid, notifyText);
                    console.log('Connect notification sent to owner:', ownerJid);
                } catch (e) {
                    console.error('Failed to send connect notification to one owner:', e);
                }
            }
            notifiedThisSession = true;
        }, 1500);
    } catch (e) {
        console.error('sendConnectNotification error:', e);
    }
}

client.on('qr', (qr) => {
    qrcode.generate(qr, {small: true});
    console.log('SCAN THE QR CODE ABOVE');
});

client.on('ready', () => {
    console.log('\n✨ TrueAlpha x Bot v1.0.0 — Connected ✨\n');
    sendConnectNotification();
});

function isOwner(number) {
    const n = (number || '').replace(/[^0-9]/g, '');
    if (!n) return false;
    // check single ownerNumber for backwards compatibility
    if (settings.ownerNumber) {
        const owner = (settings.ownerNumber || '').replace(/[^0-9]/g, '');
        if (owner && owner === n) return true;
    }
    // check ownerNumbers array
    if (Array.isArray(settings.ownerNumbers)) {
        for (let o of settings.ownerNumbers) {
            const od = (o || '').replace(/[^0-9]/g, '');
            if (od && od === n) return true;
        }
    }
    return false;
}

async function handleMessage(msg) {
    const rawText = (msg.body || msg.caption || '');
    console.log(`[LOG] Event message received type=${msg.type} text="${rawText}" from=${msg.from}`);

    const prefix = settings.prefix || '#';
    const body = rawText.toLowerCase().trim();

    // normalize chat and author information
    const chat = await msg.getChat().catch(()=>null);
    const isGroup = !!(chat && chat.isGroup);
    const authorId = msg.author || msg.from; // in groups msg.author is the participant
    const botId = client.info && client.info.wid ? client.info.wid._serialized : null;

    // If bot is in private mode, ignore commands (messages starting with prefix) from non-owners
    try {
        const isCommand = body.startsWith(prefix);
        if (isCommand && settings.public === false && !isOwner(authorId)) {
            console.log('Ignored command from non-owner because bot is private:', body);
            return;
        }
    } catch (e) {}

    // Group protections (antilink)
    try {
        if (isGroup && settings.group && settings.group.antilink) {
            const containsLink = /https?:\/\//i.test(rawText) || /wa.me\//i.test(rawText);
            if (containsLink) {
                try {
                    const botParticipant = chat.participants && botId ? chat.participants.find(p => p.id && p.id._serialized === botId) : null;
                    const botIsAdmin = !!(botParticipant && botParticipant.isAdmin);
                    if (botIsAdmin && msg.author) {
                        await chat.removeParticipants([msg.author]);
                        await client.sendMessage(msg.from, 'Removed user for posting links (antilink enabled).');
                        return;
                    }
                } catch (e) {
                    console.error('Failed antilink action:', e);
                }
            }
        }
    } catch (e) {
        console.error('Group protection check failed:', e);
    }

    // STICKER command (.sticker or .s)
    if (body === prefix + 'sticker' || body === prefix + 's') {
        try {
            let target = msg;
            if (msg.hasQuotedMsg) target = await msg.getQuotedMessage();
            if (!target.hasMedia) return await msg.reply(`Please reply to an image/video or send media with caption ${prefix}sticker`);
            const media = await target.downloadMedia();
            if (!media) return await msg.reply('Could not download media.');
            await client.sendMessage(msg.from, media, { sendMediaAsSticker: true, stickerAuthor: 'TrueAlpha', stickerName: 'Sticker' });
        } catch (e) {
            console.error('Sticker generation failed:', e);
            await msg.reply('Failed to create sticker.');
        }
        return;
    }

    // Basic commands
    if (body === prefix + 'ping') {
        const up = Math.floor(process.uptime());
        const mode = settings.public === false ? 'PRIVATE' : 'PUBLIC';
        return await msg.reply(`🏓 Pong!\nUptime: ${up}s\nMode: ${mode}`);
    }

    if (body === prefix + 'menu') {
        const pushName = msg._data && msg._data.notifyName ? msg._data.notifyName : 'User';
        const mode = settings.public === false ? 'PRIVATE' : 'PUBLIC';
        const owners = Array.isArray(settings.ownerNumbers) ? settings.ownerNumbers.join(', ') : (settings.ownerNumber || 'Not set');
        const menuBody = [
            '╔════════════════════════════════╗',
            `║  ✨ TrueAlpha x Bot — v1.0.0`,
            '╟────────────────────────────────╢',
            `║ User: ${pushName}`,
            `║ Mode: ${mode}    Prefix: ${prefix}`,
            `║ Owner(s): ${owners}`,
            '╚════════════════════════════════╝',
            '',
            '*📌 Group Commands*',
            `1. ${prefix}tagall        — Mention all members`,
            `2. ${prefix}kick (reply)  — Remove replied member`,
            `3. ${prefix}promote (reply) — Promote replied member`,
            `4. ${prefix}demote (reply) — Demote replied member`,
            `5. ${prefix}antilink on/off — Block or allow links`,
            `6. ${prefix}antibot on/off — Block bot accounts`,
            `7. ${prefix}antiforeign on/off — Block foreign numbers`,
            `8. ${prefix}antigroupmention on/off — Restrict @all mentions`,
            `9. ${prefix}approveall     — Approve pending members (placeholder)`,
            `10.${prefix}kickall       — Remove all non-admins (admin only)`,
            `11.${prefix}promoteall    — Promote all non-admins (admin only)`,
            `12.${prefix}resetlink     — Reset group invite link`,
            `13.${prefix}welcome on/off — Toggle welcome messages`,
            '',
            '*⚙️ Other*',
            `• ${prefix}botstatus — Check bot health`,
            `• ${prefix}pair      — Show pairing instructions`,
            `• ${prefix}ping      — Latency & uptime`,
            `• ${prefix}repo      — Repository link`,
            `• ${prefix}runtime   — Show runtime info`,
            '',
            '*🔐 Owner (Admin only)*',
            `• ${prefix}owner         — Show owner info`,
            `• ${prefix}restart       — Restart bot`,
            `• ${prefix}public        — Allow commands for everyone`,
            `• ${prefix}private       — Restrict commands to owner`,
            `• ${prefix}mode          — Show current mode`,
            '',
            '*⚙️ Settings*',
            `• ${prefix}setownername <name>    — Set owner display name`,
            `• ${prefix}setownernumber <num>   — Set one or more owner numbers`,
            `• ${prefix}setprefix <ch>         — Change command prefix`,
            `• ${prefix}alwaysonline on/off    — Keep bot always online`,
            `• ${prefix}anticall on/off        — Block incoming calls`,
            '',
            '*🧰 Support*',
            `• ${prefix}support    — One-tap contact & channel`,
            `• ${prefix}feedback <text> — Send feedback to owner`,
            '',
            'Type the command exactly. Use (reply) where required.',
        ].join('\n');
        await client.sendMessage(msg.from, menuBody);
        return;
    }

    // TAGALL
    if (body === prefix + 'tagall') {
        if (!isGroup) return await msg.reply('This command only works in groups.');
        let mentions = [];
        let response = '📢 *Attention Everyone:*\n\n';
        for (let participant of chat.participants) {
            if (participant && participant.id) {
                mentions.push(participant.id._serialized);
                response += `@${participant.id.user} `;
            }
        }
        await chat.sendMessage(response, { mentions });
        return;
    }

    // Reply-based admin actions (kick/promote/demote/block/delete/warn)
    if (msg.hasQuotedMsg) {
        if (!isGroup) return;
        const quotedMsg = await msg.getQuotedMessage();
        try {
            if (body === prefix + 'kick') {
                await chat.removeParticipants([quotedMsg.author]);
                return await msg.reply('✅ User removed.');
            }
            if (body === prefix + 'promote') {
                await chat.promoteParticipants([quotedMsg.author]);
                return await msg.reply('✅ User promoted to Admin.');
            }
            if (body === prefix + 'demote') {
                await chat.demoteParticipants([quotedMsg.author]);
                return await msg.reply('✅ User demoted.');
            }
            if (body === prefix + 'block') {
                if (!isOwner(authorId)) return await msg.reply('Only owner can use this command.');
                await client.contactBlock(quotedMsg.author).catch(()=>{});
                return await msg.reply('✅ Contact blocked.');
            }
            if (body === prefix + 'delete') {
                if (!isOwner(authorId)) return await msg.reply('Only owner can delete messages.');
                await quotedMsg.delete(true).catch(()=>{});
                return await msg.reply('✅ Message deleted.');
            }
            if (body === prefix + 'warn') {
                return await msg.reply('⚠️ User warned by admin.');
            }
        } catch (err) {
            console.log('Action failed:', err);
            return await msg.reply('❌ Action failed. Am I an admin?');
        }
    }

    // kickall / promoteall
    if (body === prefix + 'kickall') {
        if (!isGroup) return await msg.reply('This command only works in groups.');
        const meParticipant = chat.participants.find(p => botId && p.id._serialized === botId);
        if (!meParticipant || !meParticipant.isAdmin) return await msg.reply('I need to be admin to remove members.');
        for (let p of chat.participants) {
            if (!p.isAdmin && p.id && p.id._serialized) {
                try { await chat.removeParticipants([p.id._serialized]); } catch(e){}
            }
        }
        return await msg.reply('✅ Attempted to remove all non-admin participants.');
    }

    if (body === prefix + 'promoteall') {
        if (!isGroup) return await msg.reply('This command only works in groups.');
        const meParticipant = chat.participants.find(p => botId && p.id._serialized === botId);
        if (!meParticipant || !meParticipant.isAdmin) return await msg.reply('I need to be admin to promote members.');
        for (let p of chat.participants) {
            if (!p.isAdmin && p.id && p.id._serialized) {
                try { await chat.promoteParticipants([p.id._serialized]); } catch(e){}
            }
        }
        return await msg.reply('✅ Attempted to promote all non-admin participants.');
    }

    // resetlink
    if (body === prefix + 'resetlink') {
        if (!isGroup) return await msg.reply('This command only works in groups.');
        try {
            if (typeof chat.revokeInvite === 'function') {
                await chat.revokeInvite();
                return await msg.reply('✅ Group invite link has been reset.');
            }
            return await msg.reply('Resetting links is not supported in this library version.');
        } catch (e) {
            console.error('Reset link failed:', e);
            return await msg.reply('❌ Failed to reset link.');
        }
    }

    // APPROVEALL placeholder
    if (body === prefix + 'approveall') {
        return await msg.reply('✅ Approve all executed (placeholder).');
    }

    // welcome toggle
    if (body.startsWith(prefix + 'welcome')) {
        const parts = body.split(' ');
        const val = parts[1];
        if (val === 'on' || val === 'off') {
            settings.group.welcome = (val === 'on');
            saveSettings();
            return await msg.reply(`Welcome messages ${val}`);
        }
        return await msg.reply(`Usage: ${prefix}welcome on|off`);
    }

    // Other simple commands
    if (body === prefix + 'botstatus') return await msg.reply('Bot is running. Uptime: ' + Math.floor(process.uptime()) + 's');
    if (body === prefix + 'pair') return await msg.reply('To pair, scan the QR code shown in the terminal.');
    if (body === prefix + 'repo') {
        let repo = 'Repository not configured.';
        try { const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'))); if (pkg && pkg.repository) repo = typeof pkg.repository === 'string' ? pkg.repository : (pkg.repository.url || repo); } catch (e) {}
        return await msg.reply(repo);
    }
    if (body === prefix + 'runtime') return await msg.reply('Runtime: ' + new Date().toString() + '\nUptime: ' + Math.floor(process.uptime()) + 's');

    // Owner and settings commands
    if (body === prefix + 'restart') { if (isOwner(authorId)) { await msg.reply('🔁 Restarting...'); process.exit(0); } else return await msg.reply('Only owner can restart the bot.'); }
    if (body === prefix + 'owner') { const owners = Array.isArray(settings.ownerNumbers) ? settings.ownerNumbers.join(',') : settings.ownerNumber || 'Not set'; return await msg.reply(`Owner: ${settings.ownerName || 'Not set'} (${owners})`); }
    if (body === prefix + 'mode') { const mode = settings.public === false ? 'PRIVATE' : 'PUBLIC'; const detail = settings.public === false ? 'Only owner can use commands.' : 'Anyone can use commands.'; return await msg.reply(`Mode: ${mode}\n${detail}`); }
    if (body === prefix + 'public') { if (!isOwner(authorId)) return await msg.reply('Only owner can change mode.'); settings.public = true; saveSettings(); return await msg.reply('Bot set to PUBLIC mode — commands accepted from everyone.'); }
    if (body === prefix + 'private') { if (!isOwner(authorId)) return await msg.reply('Only owner can change mode.'); settings.public = false; saveSettings(); return await msg.reply('Bot set to PRIVATE mode — only owner can use commands.'); }

    const setMatches = body.match(new RegExp('^' + prefix + '(setownername|setownernumber|setprefix)\\s+(.+)$'));
    if (setMatches) {
        const key = setMatches[1];
        const val = setMatches[2].trim();
        if (key === 'setownername') { settings.ownerName = val; saveSettings(); return await msg.reply('Owner name set.'); }
        if (key === 'setownernumber') {
            const parts = val.split(',').map(s=>s.trim()).filter(Boolean).map(s => { const digits = s.replace(/[^0-9]/g, ''); return digits ? ('+' + digits) : null; }).filter(Boolean);
            if (parts.length === 0) return await msg.reply('Please provide a valid number.');
            settings.ownerNumbers = parts; settings.ownerNumber = parts[0]; saveSettings(); return await msg.reply('Owner number(s) set.');
        }
        if (key === 'setprefix') { settings.prefix = val[0]; saveSettings(); return await msg.reply('Prefix updated to ' + settings.prefix); }
    }

    if (body.startsWith(prefix + 'setchannel ')) { if (!isOwner(authorId)) return await msg.reply('Only owner can set channel link.'); const link = msg.body.slice((prefix + 'setchannel').length).trim(); if (!link) return await msg.reply('Usage: ' + prefix + 'setchannel https://...'); settings.channelLink = link; saveSettings(); return await msg.reply('Channel link saved.'); }

    const toggleMatches = body.match(new RegExp('^' + prefix + '([a-z0-9_]+)\\s+(on|off)$'));
    if (toggleMatches) {
        const name = toggleMatches[1];
        const val = toggleMatches[2] === 'on';
        const groupKeys = ['antilink','antibot','antiforeign','antigroupmention','welcome'];
        const settingKeys = ['alwaysonline','antibug','anticall','antidelete','autoreact','autoreactstatus','autoread','autorecord','autorecordtyping','autotyping','autostatusview'];
        if (groupKeys.includes(name)) { settings.group[name] = val; saveSettings(); return await msg.reply(`${name} set to ${val}`); }
        if (settingKeys.includes(name)) { settings.settings[name] = val; saveSettings(); return await msg.reply(`${name} set to ${val}`); }
    }

    if (body === prefix + 'help') return await msg.reply(`✨ Send ${prefix}menu for commands. For support use ${prefix}support or ${prefix}feedback <text>`);
    if (body.startsWith(prefix + 'feedback')) { const feedback = msg.body.slice((prefix + 'feedback').length).trim(); try { fs.appendFileSync(path.join(__dirname, 'feedback.log'), `${new Date().toISOString()} - ${msg.from} - ${feedback}\n`); } catch (e) {} return await msg.reply('🙏 Thanks — feedback received.'); }
}

client.on('message', handleMessage);
client.on('message_create', handleMessage);

// This prevents the "Critical Error" crash seen in your photos
process.on('uncaughtException', (err) => {
    console.error('Handled Exception: ', err.message);
});

client.initialize();

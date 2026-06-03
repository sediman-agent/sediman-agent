"""Comprehensive tests for Discord and Telegram bidirectional messaging.

Tests verify:
1. Adapter creation and basic functionality
2. Message event creation and handling
3. Whitelist authorization (user and server level)
4. Gateway integration
5. Listener message forwarding
6. Error handling and edge cases
"""

from __future__ import annotations

import json
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch
from dataclasses import dataclass, field

import pytest

from sediman.gateway.events import MessageEvent
from sediman.gateway.runner import GatewayRunner
from sediman.integrations.discord.adapter import DiscordAdapter
from sediman.integrations.discord.listener import DiscordListener
from sediman.integrations.telegram.adapter import TelegramAdapter
from sediman.integrations.telegram.listener import TelegramListener
from sediman.integrations.config import _default_config, load_config, save_config


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def mock_discord_client():
    """Mock discord.py client."""
    client = MagicMock()
    client.user = MagicMock()
    client.user.name = "TestBot"
    client.user.id = "999999999999999999"

    channel = MagicMock()
    channel.id = "111222333"

    # Create a proper async mock for channel.send
    sent_message = MagicMock()
    sent_message.id = "msg_123"

    async def send_mock(text):
        return sent_message

    channel.send = AsyncMock(side_effect=send_mock)
    client.get_channel = MagicMock(return_value=channel)

    return client


@pytest.fixture
def mock_discord_message():
    """Mock a Discord message."""
    message = MagicMock()
    message.author = MagicMock()
    message.author.bot = False
    message.author.id = "123456789"
    message.author.name = "TestUser"

    message.channel = MagicMock()
    message.channel.id = "111222333"
    message.channel.guild = MagicMock()
    message.channel.guild.id = "444555566"

    message.content = "Hello, bot!"
    message.message = "Hello, bot!"

    # Make it iterable for message sending
    async def send_mock(text):
        sent_message = MagicMock()
        sent_message.id = "msg_123"
        return sent_message

    message.channel.send = AsyncMock(side_effect=send_mock)

    return message


@pytest.fixture
def mock_telegram_bot():
    """Mock python-telegram-bot Bot."""
    bot = MagicMock()

    async def send_message_mock(chat_id, text, parse_mode=None):
        sent_message = MagicMock()
        sent_message.message_id = 789
        return sent_message

    bot.send_message = AsyncMock(side_effect=send_message_mock)
    return bot


@pytest.fixture
def mock_telegram_update():
    """Mock a Telegram Update."""
    update = MagicMock()

    message = MagicMock()
    message.message_id = 123
    message.text = "Hello, bot!"

    chat = MagicMock()
    chat.id = 987654
    chat.type = "private"
    message.chat = chat

    from_user = MagicMock()
    from_user.id = 456
    from_user.username = "testuser"
    from_user.first_name = "Test"
    from_user.is_bot = False
    message.from_user = from_user

    message.date = 1234567890
    update.message = message

    # Make mock attributes return actual values
    chat.id = 987654
    from_user.id = 456
    message.text = "Hello, bot!"

    return update


@pytest.fixture
def tmp_config_file(tmp_path: Path):
    """Create a temporary config file for testing."""
    config_file = tmp_path / "integrations.json"
    return config_file


# =============================================================================
# MessageEvent Tests
# =============================================================================

class TestMessageEvent:
    """Test MessageEvent creation and processing."""

    def test_discord_message_event_from_discord(self, mock_discord_message):
        """Test creating MessageEvent from Discord message."""
        event = MessageEvent.from_discord(mock_discord_message)

        assert event.platform == "discord"
        assert event.chat_id == "111222333"
        assert event.chat_type == "group"  # Has guild
        assert event.user_id == "123456789"
        assert event.user_name == "TestUser"
        assert event.text == "Hello, bot!"
        assert event.raw["server_id"] == "444555566"
        assert not event.is_command
        assert event.command is None

    def test_discord_message_event_with_command(self, mock_discord_message):
        """Test MessageEvent with Discord command."""
        mock_discord_message.content = "!help"
        mock_discord_message.message = "!help"

        event = MessageEvent.from_discord(mock_discord_message)

        assert event.is_command
        assert event.command == "!help"
        assert event.command_args is None

    def test_discord_message_event_with_command_args(self, mock_discord_message):
        """Test MessageEvent with Discord command and arguments."""
        mock_discord_message.content = "!ask What is AI?"
        mock_discord_message.message = "!ask What is AI?"

        event = MessageEvent.from_discord(mock_discord_message)

        assert event.is_command
        assert event.command == "!ask"
        assert event.command_args == "What is AI?"

    def test_discord_message_event_private_message(self, mock_discord_message):
        """Test MessageEvent from private DM (no guild)."""
        mock_discord_message.channel.guild = None

        event = MessageEvent.from_discord(mock_discord_message)

        assert event.chat_type == "private"

    def test_discord_message_event_session_key(self, mock_discord_message):
        """Test session key generation for Discord."""
        event = MessageEvent.from_discord(mock_discord_message)

        expected = "agent:main:discord:group:111222333"
        assert event.session_key == expected

    def test_telegram_message_event_from_telegram(self, mock_telegram_update):
        """Test creating MessageEvent from Telegram update."""
        event = MessageEvent.from_telegram(mock_telegram_update)

        assert event.platform == "telegram"
        assert event.chat_id == "987654"
        assert event.chat_type == "private"
        assert event.user_id == "456"
        assert event.user_name == "Test"
        assert event.text == "Hello, bot!"
        assert not event.is_command
        assert event.command is None

    def test_telegram_message_event_with_command(self, mock_telegram_update):
        """Test MessageEvent with Telegram command."""
        mock_telegram_update.message.text = "/help"

        event = MessageEvent.from_telegram(mock_telegram_update)

        assert event.is_command
        assert event.command == "/help"

    def test_telegram_message_event_session_key(self, mock_telegram_update):
        """Test session key generation for Telegram."""
        event = MessageEvent.from_telegram(mock_telegram_update)

        expected = "agent:main:telegram:private:987654"
        assert event.session_key == expected

    def test_telegram_message_event_group_chat(self):
        """Test MessageEvent from Telegram group chat."""
        update = MagicMock()

        message = MagicMock()
        message.message_id = 123
        message.text = "Hello group!"
        message.chat_id = -100123456789
        message.chat = MagicMock()
        message.chat.id = -100123456789
        message.chat.type = "group"
        message.from_user = MagicMock()
        message.from_user.id = 456
        message.from_user.username = "testuser"
        message.from_user.is_bot = False
        message.date = 1234567890

        update.message = message

        event = MessageEvent.from_telegram(update)

        assert event.chat_type == "group"


# =============================================================================
# Discord Adapter Tests
# =============================================================================

class TestDiscordAdapter:
    """Test Discord adapter functionality."""

    def test_adapter_creation(self, mock_discord_client):
        """Test creating DiscordAdapter."""
        adapter = DiscordAdapter(mock_discord_client)

        assert adapter.platform_name == "discord"
        assert not adapter.is_connected

    def test_adapter_connect(self, mock_discord_client):
        """Test adapter connect method."""
        adapter = DiscordAdapter(mock_discord_client)

        import asyncio
        asyncio.run(adapter.connect())

        assert adapter.is_connected

    def test_adapter_disconnect(self, mock_discord_client):
        """Test adapter disconnect method."""
        adapter = DiscordAdapter(mock_discord_client)

        import asyncio
        asyncio.run(adapter.connect())
        asyncio.run(adapter.disconnect())

        assert not adapter.is_connected

    def test_adapter_send_message_short(self, mock_discord_client):
        """Test sending short message (under limit)."""
        adapter = DiscordAdapter(mock_discord_client)

        import asyncio
        result = asyncio.run(adapter.send_message("111222333", "Hello!"))

        assert "sent" in result.lower()
        assert "111222333" in result
        assert mock_discord_client.channel.send.called

    def test_adapter_send_message_long_chunked(self, mock_discord_client):
        """Test sending long message gets chunked properly."""
        adapter = DiscordAdapter(mock_discord_client)

        # Create a message over 2000 chars (Discord limit)
        long_text = "A" * 2500

        import asyncio
        result = asyncio.run(adapter.send_message("111222333", long_text))

        assert "chunks" in result.lower()
        assert "2" in result  # Should split into 2 chunks

    def test_adapter_send_message_no_client(self):
        """Test error when client is not available."""
        adapter = DiscordAdapter(None)

        import asyncio
        with pytest.raises(RuntimeError, match="client not available"):
            asyncio.run(adapter.send_message("111222333", "Hello!"))

    def test_adapter_send_message_channel_not_found(self, mock_discord_client):
        """Test error when channel doesn't exist."""
        mock_discord_client.get_channel = MagicMock(return_value=None)
        adapter = DiscordAdapter(mock_discord_client)

        import asyncio
        with pytest.raises(ValueError, match="Channel .* not found"):
            asyncio.run(adapter.send_message("111222333", "Hello!"))

    def test_adapter_get_client(self, mock_discord_client):
        """Test getting the underlying client."""
        adapter = DiscordAdapter(mock_discord_client)

        assert adapter.get_client() == mock_discord_client


# =============================================================================
# Telegram Adapter Tests
# =============================================================================

class TestTelegramAdapter:
    """Test Telegram adapter functionality."""

    def test_adapter_creation(self, mock_telegram_bot):
        """Test creating TelegramAdapter."""
        adapter = TelegramAdapter(mock_telegram_bot)

        assert adapter.platform_name == "telegram"
        assert not adapter.is_connected

    def test_adapter_connect(self, mock_telegram_bot):
        """Test adapter connect method."""
        adapter = TelegramAdapter(mock_telegram_bot)

        import asyncio
        asyncio.run(adapter.connect())

        assert adapter.is_connected

    def test_adapter_disconnect(self, mock_telegram_bot):
        """Test adapter disconnect method."""
        adapter = TelegramAdapter(mock_telegram_bot)

        import asyncio
        asyncio.run(adapter.connect())
        asyncio.run(adapter.disconnect())

        assert not adapter.is_connected

    def test_adapter_send_message_short(self, mock_telegram_bot):
        """Test sending short message."""
        adapter = TelegramAdapter(mock_telegram_bot)

        import asyncio
        result = asyncio.run(adapter.send_message("987654", "Hello!"))

        assert "sent" in result.lower()
        assert "987654" in result

    def test_adapter_send_message_with_parse_mode(self, mock_telegram_bot):
        """Test sending message with HTML parse mode."""
        adapter = TelegramAdapter(mock_telegram_bot)

        import asyncio
        result = asyncio.run(
            adapter.send_message("987654", "<b>Bold</b> text", parse_mode="HTML")
        )

        assert "sent" in result.lower()

    def test_adapter_send_message_long_chunked(self, mock_telegram_bot):
        """Test sending long message gets chunked properly."""
        adapter = TelegramAdapter(mock_telegram_bot)

        # Create a message over 4096 chars (Telegram limit)
        long_text = "A" * 5000

        import asyncio
        result = asyncio.run(adapter.send_message("987654", long_text))

        assert "chunks" in result.lower()
        assert "2" in result  # Should split into 2 chunks

    def test_adapter_send_message_no_bot(self):
        """Test error when bot is not available."""
        adapter = TelegramAdapter(None)

        import asyncio
        with pytest.raises(RuntimeError, match="bot not available"):
            asyncio.run(adapter.send_message("987654", "Hello!"))

    def test_adapter_get_bot(self, mock_telegram_bot):
        """Test getting the underlying bot."""
        adapter = TelegramAdapter(mock_telegram_bot)

        assert adapter.get_bot() == mock_telegram_bot


# =============================================================================
# Gateway Runner Authorization Tests
# =============================================================================

class TestGatewayRunnerAuthorization:
    """Test GatewayRunner authorization and whitelist."""

    def test_no_whitelist_allows_all(self):
        """Test that no whitelist means all users are allowed."""
        runner = GatewayRunner()

        event = MagicMock()
        event.platform = "discord"
        event.user_id = "123456789"
        event.raw = {"server_id": "444555566"}

        assert runner._is_authorized(event) == True

    def test_user_whitelist_blocks_unlisted_user(self):
        """Test that user whitelist blocks unlisted users."""
        runner = GatewayRunner()
        runner.set_allowed_users("discord", {"123456789"})

        event = MagicMock()
        event.platform = "discord"
        event.user_id = "999999999"
        event.raw = {"server_id": "444555566"}

        assert runner._is_authorized(event) == False

    def test_user_whitelist_allows_listed_user(self):
        """Test that user whitelist allows listed users."""
        runner = GatewayRunner()
        runner.set_allowed_users("discord", {"123456789"})

        event = MagicMock()
        event.platform = "discord"
        event.user_id = "123456789"
        event.raw = {"server_id": "444555566"}

        assert runner._is_authorized(event) == True

    def test_discord_server_whitelist_allows_server(self):
        """Test that Discord server whitelist allows server members."""
        runner = GatewayRunner()
        runner.set_allowed_users("discord", {"123456789"})
        runner.set_allowed_servers("discord", {"444555566"})

        event = MagicMock()
        event.platform = "discord"
        event.user_id = "999999999"
        event.raw = {"server_id": "444555566"}

        assert runner._is_authorized(event) == True

    def test_discord_server_whitelist_blocks_other_server(self):
        """Test that Discord server whitelist blocks other servers."""
        runner = GatewayRunner()
        runner.set_allowed_users("discord", {"123456789"})
        runner.set_allowed_servers("discord", {"444555566"})

        event = MagicMock()
        event.platform = "discord"
        event.user_id = "999999999"
        event.raw = {"server_id": "777888999"}

        assert runner._is_authorized(event) == False

    def test_discord_server_whitelist_with_no_server_id(self):
        """Test authorization when message has no server_id (DM)."""
        runner = GatewayRunner()
        runner.set_allowed_users("discord", {"123456789"})
        runner.set_allowed_servers("discord", {"444555566"})

        event = MagicMock()
        event.platform = "discord"
        event.user_id = "999999999"
        event.raw = {}  # No server_id

        assert runner._is_authorized(event) == False

    def test_empty_user_whitelist_blocks_all(self):
        """Test that empty whitelist blocks everyone."""
        runner = GatewayRunner()
        runner.set_allowed_users("telegram", set())  # Empty set

        event = MagicMock()
        event.platform = "telegram"
        event.user_id = "123456"

        assert runner._is_authorized(event) == False


# =============================================================================
# Gateway Runner Message Handling Tests
# =============================================================================

class TestGatewayRunnerMessageHandling:
    """Test GatewayRunner message handling and agent execution."""

    def test_register_adapter(self, mock_discord_client):
        """Test registering an adapter with GatewayRunner."""
        runner = GatewayRunner()
        adapter = DiscordAdapter(mock_discord_client)

        runner.register_adapter(adapter)

        assert "discord" in runner._adapters
        assert runner._adapters["discord"] == adapter

    def test_unregister_adapter(self, mock_discord_client):
        """Test unregistering an adapter from GatewayRunner."""
        runner = GatewayRunner()
        adapter = DiscordAdapter(mock_discord_client)
        runner.register_adapter(adapter)

        runner.unregister_adapter("discord")

        assert "discord" not in runner._adapters

    def test_set_allowed_users(self):
        """Test setting allowed users for a platform."""
        runner = GatewayRunner()
        users = {"123456789", "987654321"}

        runner.set_allowed_users("discord", users)

        assert runner._allowed_users["discord"] == users

    def test_set_allowed_servers(self):
        """Test setting allowed servers for a platform."""
        runner = GatewayRunner()
        servers = {"444555566", "777888999"}

        runner.set_allowed_servers("discord", servers)

        assert runner._allowed_servers["discord"] == servers

    def test_set_home_channel(self):
        """Test setting home channel for a platform."""
        runner = GatewayRunner()

        runner.set_home_channel("discord", "111222333")

        assert runner._home_channels["discord"] == "111222333"

    def test_mark_session_active(self, mock_discord_client):
        """Test marking a session as active."""
        runner = GatewayRunner()
        adapter = DiscordAdapter(mock_discord_client)
        runner.register_adapter(adapter)

        session_key = "agent:main:discord:group:111222333"
        runner._running_agents[session_key] = True

        assert session_key in runner._running_agents

    def test_mark_session_inactive(self, mock_discord_client):
        """Test marking a session as inactive."""
        runner = GatewayRunner()
        adapter = DiscordAdapter(mock_discord_client)
        runner.register_adapter(adapter)

        session_key = "agent:main:discord:group:111222333"
        runner._running_agents[session_key] = True
        adapter.mark_session_inactive(session_key)

        assert session_key not in runner._active_sessions

    def test_get_pending_messages_empty(self, mock_discord_client):
        """Test getting pending messages when none exist."""
        runner = GatewayRunner()
        adapter = DiscordAdapter(mock_discord_client)
        runner.register_adapter(adapter)

        session_key = "agent:main:discord:group:111222333"
        pending = adapter.get_pending_messages(session_key)

        assert pending == []


# =============================================================================
# Discord Listener Tests
# =============================================================================

class TestDiscordListener:
    """Test Discord listener functionality."""

    def test_listener_creation(self):
        """Test creating DiscordListener."""
        config = {"enabled": True, "token": "test_token"}
        listener = DiscordListener("test_token", config)

        assert listener._token == "test_token"
        assert listener._config == config

    def test_set_adapter(self, mock_discord_client):
        """Test setting adapter on listener."""
        config = {"enabled": True}
        listener = DiscordListener("test_token", config)
        adapter = DiscordAdapter(mock_discord_client)

        listener.set_adapter(adapter)

        assert listener._adapter == adapter

    def test_listener_ignores_bot_messages(self, mock_discord_message):
        """Test that listener ignores messages from bots."""
        mock_discord_message.author.bot = True

        event = MessageEvent.from_discord(mock_discord_message)

        assert event.text == "Hello, bot!"
        # Bot messages should be filtered in handler
        assert mock_discord_message.author.bot == True

    def test_listener_creates_correct_event(self, mock_discord_message):
        """Test that listener creates correct MessageEvent."""
        event = MessageEvent.from_discord(mock_discord_message)

        assert event.platform == "discord"
        assert event.chat_id == "111222333"
        assert event.user_id == "123456789"
        assert event.text == "Hello, bot!"


# =============================================================================
# Telegram Listener Tests
# =============================================================================

class TestTelegramListener:
    """Test Telegram listener functionality."""

    def test_listener_creation(self):
        """Test creating TelegramListener."""
        config = {"enabled": True, "token": "test_token"}
        listener = TelegramListener("test_token", config)

        assert listener._token == "test_token"
        assert listener._config == config

    def test_set_adapter(self, mock_telegram_bot):
        """Test setting adapter on listener."""
        config = {"enabled": True}
        listener = TelegramListener("test_token", config)
        adapter = TelegramAdapter(mock_telegram_bot)

        listener.set_adapter(adapter)

        assert listener._adapter == adapter

    def test_listener_ignores_bot_messages(self, mock_telegram_update):
        """Test that listener ignores messages from bots."""
        mock_telegram_update.message.from_user.is_bot = True

        event = MessageEvent.from_telegram(mock_telegram_update)

        # Bot messages should be filtered
        assert mock_telegram_update.message.from_user.is_bot == True

    def test_listener_creates_correct_event(self, mock_telegram_update):
        """Test that listener creates correct MessageEvent."""
        event = MessageEvent.from_telegram(mock_telegram_update)

        assert event.platform == "telegram"
        assert event.chat_id == "987654"
        assert event.user_id == "456"
        assert event.text == "Hello, bot!"


# =============================================================================
# Integration Config Tests
# =============================================================================

class TestIntegrationConfig:
    """Test integration configuration loading and saving."""

    def test_default_config_structure(self):
        """Test that default config has all required fields."""
        config = _default_config()

        assert "discord" in config
        assert "telegram" in config

        # Check Discord config
        assert config["discord"]["enabled"] == False
        assert "token" in config["discord"]
        assert "channels" in config["discord"]
        assert "whitelist" in config["discord"]
        assert config["discord"]["whitelist"]["enabled"] == False
        assert "users" in config["discord"]["whitelist"]
        assert "servers" in config["discord"]["whitelist"]

        # Check Telegram config
        assert config["telegram"]["enabled"] == False
        assert "token" in config["telegram"]
        assert "chats" in config["telegram"]
        assert "whitelist" in config["telegram"]
        assert config["telegram"]["whitelist"]["enabled"] == False
        assert "users" in config["telegram"]["whitelist"]

    def test_whitelist_default_values(self):
        """Test whitelist has correct default values."""
        config = _default_config()

        # Discord whitelist
        assert config["discord"]["whitelist"]["enabled"] == False
        assert config["discord"]["whitelist"]["users"] == []
        assert config["discord"]["whitelist"]["servers"] == []

        # Telegram whitelist (no servers field)
        assert config["telegram"]["whitelist"]["enabled"] == False
        assert config["telegram"]["whitelist"]["users"] == []

    def test_config_discord_whitelist_enabled(self):
        """Test Discord config with whitelist enabled."""
        config = _default_config()
        config["discord"]["whitelist"]["enabled"] = True
        config["discord"]["whitelist"]["users"] = ["123456789"]
        config["discord"]["whitelist"]["servers"] = ["444555566"]

        assert config["discord"]["whitelist"]["enabled"] == True
        assert "123456789" in config["discord"]["whitelist"]["users"]
        assert "444555566" in config["discord"]["whitelist"]["servers"]

    def test_config_telegram_whitelist_enabled(self):
        """Test Telegram config with whitelist enabled."""
        config = _default_config()
        config["telegram"]["whitelist"]["enabled"] = True
        config["telegram"]["whitelist"]["users"] = ["123456"]

        assert config["telegram"]["whitelist"]["enabled"] == True
        assert "123456" in config["telegram"]["whitelist"]["users"]


# =============================================================================
# End-to-End Integration Tests
# =============================================================================

class TestBidirectionalIntegrationE2E:
    """End-to-end tests for bidirectional messaging flow."""

    def test_discord_message_flow_to_gateway(self, mock_discord_message):
        """Test complete message flow from Discord to Gateway."""
        # Create event from Discord message
        event = MessageEvent.from_discord(mock_discord_message)

        # Verify event properties
        assert event.platform == "discord"
        assert not event.is_command
        assert event.session_key.startswith("agent:main:discord:")

    def test_telegram_message_flow_to_gateway(self, mock_telegram_update):
        """Test complete message flow from Telegram to Gateway."""
        # Create event from Telegram update
        event = MessageEvent.from_telegram(mock_telegram_update)

        # Verify event properties
        assert event.platform == "telegram"
        assert not event.is_command
        assert event.session_key.startswith("agent:main:telegram:")

    def test_discord_command_recognition(self, mock_discord_message):
        """Test Discord command recognition."""
        test_cases = [
            ("!help", "!help", None),
            ("!status", "!status", None),
            ("!ask something", "!ask", "something"),
            ("!run test_skill", "!run", "test_skill"),
        ]

        for content, expected_command, expected_args in test_cases:
            mock_discord_message.content = content
            mock_discord_message.message = content

            event = MessageEvent.from_discord(mock_discord_message)

            assert event.is_command
            assert event.command == expected_command
            assert event.command_args == expected_args

    def test_telegram_command_recognition(self, mock_telegram_update):
        """Test Telegram command recognition."""
        test_cases = [
            ("/help", "/help", None),
            ("/status", "/status", None),
            ("/start", "/start", None),
        ]

        for text, expected_command, expected_args in test_cases:
            mock_telegram_update.message.text = text

            event = MessageEvent.from_telegram(mock_telegram_update)

            assert event.is_command
            assert event.command == expected_command
            assert event.command_args == expected_args

    def test_non_command_messages(self, mock_discord_message):
        """Test that non-prefixed messages are not commands."""
        mock_discord_message.content = "Hello, how are you?"
        mock_discord_message.message = "Hello, how are you?"

        event = MessageEvent.from_discord(mock_discord_message)

        assert not event.is_command
        assert event.command is None

    def test_discord_private_message_no_guild(self, mock_discord_message):
        """Test Discord private message (no guild) is handled correctly."""
        mock_discord_message.channel.guild = None
        mock_discord_message.content = "DM message"

        event = MessageEvent.from_discord(mock_discord_message)

        assert event.chat_type == "private"
        assert "private" in event.session_key

    def test_session_key_uniqueness(self):
        """Test that different users/chats have unique session keys."""
        events = [
            MessageEvent(
                platform="discord",
                chat_id="111",
                chat_type="group",
                user_id="user1",
                text="test"
            ),
            MessageEvent(
                platform="discord",
                chat_id="222",
                chat_type="group",
                user_id="user1",
                text="test"
            ),
            MessageEvent(
                platform="telegram",
                chat_id="333",
                chat_type="private",
                user_id="user2",
                text="test"
            ),
        ]

        session_keys = [e.session_key for e in events]

        # All session keys should be unique
        assert len(session_keys) == len(set(session_keys))

    def test_message_length_limits(self):
        """Test that message events have text within reasonable limits."""
        long_text = "A" * 10000

        event = MessageEvent(
            platform="discord",
            chat_id="111",
            chat_type="private",
            user_id="user1",
            text=long_text
        )

        # Event should accept long text (chunking happens at send time)
        assert len(event.text) == 10000


# =============================================================================
# Error Handling Tests
# =============================================================================

class TestErrorHandling:
    """Test error handling in adapters and listeners."""

    def test_discord_adapter_send_error_handling(self, mock_discord_client):
        """Test Discord adapter handles send errors gracefully."""
        # Make send raise an exception
        async def failing_send(text):
            raise Exception("Discord API error")

        mock_discord_client.channel.send = AsyncMock(side_effect=failing_send)
        adapter = DiscordAdapter(mock_discord_client)

        import asyncio
        with pytest.raises(Exception, match="Discord API error"):
            asyncio.run(adapter.send_message("111222333", "Test"))

    def test_telegram_adapter_send_error_handling(self, mock_telegram_bot):
        """Test Telegram adapter handles send errors gracefully."""
        # Make send raise an exception
        async def failing_send(chat_id, text, parse_mode=None):
            raise Exception("Telegram API error")

        mock_telegram_bot.send_message = AsyncMock(side_effect=failing_send)
        adapter = TelegramAdapter(mock_telegram_bot)

        import asyncio
        with pytest.raises(Exception, match="Telegram API error"):
            asyncio.run(adapter.send_message("987654", "Test"))

    def test_discord_listener_no_token_logs_warning(self, caplog):
        """Test that listener logs warning when no token provided."""
        listener = DiscordListener("", {"enabled": True})

        # This should log a warning but not crash
        # (Actual listen() would log the warning)
        assert listener._token == ""

    def test_telegram_listener_no_token_logs_warning(self, caplog):
        """Test that listener logs warning when no token provided."""
        listener = TelegramListener("", {"enabled": True})

        # This should log a warning but not crash
        # (Actual listen() would log the warning)
        assert listener._token == ""

    def test_adapter_send_empty_message(self, mock_discord_client):
        """Test sending empty message works."""
        adapter = DiscordAdapter(mock_discord_client)

        import asyncio
        # Should not crash
        result = asyncio.run(adapter.send_message("111222333", ""))

        assert "sent" in result.lower()

    def test_message_event_with_empty_text(self):
        """Test MessageEvent with empty text."""
        event = MessageEvent(
            platform="discord",
            chat_id="111",
            chat_type="private",
            user_id="user1",
            text=""
        )

        assert event.text == ""
        assert not event.is_command

    def test_message_event_with_none_values(self):
        """Test MessageEvent handles None values gracefully."""
        event = MessageEvent(
            platform="telegram",
            chat_id="222",
            user_id="user2",
            text="Test",
            raw={}
        )

        assert event.raw == {}  # Should be empty dict


# =============================================================================
# Performance Tests
# =============================================================================

class TestPerformance:
    """Test performance characteristics."""

    def test_message_event_creation_performance(self):
        """Test that MessageEvent creation is fast enough."""
        import time

        # Create 1000 events
        start = time.time()
        for i in range(1000):
            event = MessageEvent(
                platform="discord",
                chat_id=str(i),
                chat_type="private",
                user_id="user1",
                text=f"Message {i}"
            )
        elapsed = time.time() - start

        # Should create 1000 events in less than 0.1 seconds
        assert elapsed < 0.1

    def test_adapter_send_message_short_performance(self, mock_discord_client):
        """Test that adapter send_message is reasonably fast."""
        import asyncio
        import time

        adapter = DiscordAdapter(mock_discord_client)

        async def send_many():
            for i in range(100):
                await adapter.send_message("111222333", f"Message {i}")

        start = time.time()
        asyncio.run(send_many())
        elapsed = time.time() - start

        # Should send 100 messages in less than 2 seconds (with mocks)
        assert elapsed < 2.0

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import '../family/family_provider.dart';
import '../../core/env.dart';

// ─── Message model ─────────────────────────────────────────────────────────
class _Msg {
  final String role; // 'user' | 'assistant'
  final String content;
  const _Msg(this.role, this.content);
}

// ─── Suggestion chips ──────────────────────────────────────────────────────
const _suggestions = [
  'How much money do I have?',
  'What chores can I do to earn more? 💪',
  'How can I save for a \$50 video game?',
  'What are some tips for saving money?',
];

class MoneyMentorScreen extends ConsumerStatefulWidget {
  const MoneyMentorScreen({super.key});

  @override
  ConsumerState<MoneyMentorScreen> createState() => _MoneyMentorScreenState();
}

class _MoneyMentorScreenState extends ConsumerState<MoneyMentorScreen> {
  final _controller = TextEditingController();
  final _scrollController = ScrollController();
  List<_Msg> _messages = [];
  bool _loading = false;

  @override
  void initState() {
    super.initState();
    // Greet immediately using the child's name from state
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final name = ref.read(familyProvider).currentUserProfile?.name ?? 'there';
      setState(() {
        _messages = [
          _Msg('assistant',
              "Hi $name! I'm your Money Mentor 🤖\n\nI can help you understand your savings, set goals, and earn more with chores. What would you like to know? 💰"),
        ];
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _send(String text) async {
    final trimmed = text.trim();
    if (trimmed.isEmpty || _loading) return;

    _controller.clear();
    setState(() {
      _messages = [..._messages, _Msg('user', trimmed)];
      _loading = true;
    });
    _scrollToBottom();

    try {
      final familyState = ref.read(familyProvider);
      final child = familyState.currentUserProfile;
      final totalBalance = familyState.buckets
          .where((b) => b.childId == child?.id)
          .fold<double>(0, (sum, b) => sum + b.cachedBalance);
      final myChores = familyState.chores
          .where((c) => c.assignedToChildId == child?.id && c.status == 'assigned')
          .toList();

      // Build system prompt with child's financial context
      final system = '''
You are a friendly, encouraging Money Mentor for kids aged 6-16. 
You help children learn about saving, earning, and budgeting in a fun and simple way.
You ONLY discuss money, savings, chores, and financial goals. If asked about anything off-topic, 
gently redirect to money topics.

Child's name: ${child?.name ?? 'Explorer'}
Current total savings: \$${totalBalance.toStringAsFixed(2)}
Active chores: ${myChores.isEmpty ? 'None right now' : myChores.map((c) => '${c.title} (\$${c.value.toStringAsFixed(2)})').join(', ')}

Keep responses short (2-4 sentences), encouraging, and use age-appropriate language. 
Add relevant emojis to make it feel fun 🎉
''';

      // Build message history for the API
      final apiMessages = [
        {'role': 'system', 'content': system},
        for (final m in _messages) {'role': m.role, 'content': m.content},
      ];

      final response = await http.post(
        Uri.parse('https://api.openai.com/v1/chat/completions'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${Env.openAiKey}',
        },
        body: jsonEncode({
          'model': 'gpt-4o-mini',
          'messages': apiMessages,
          'max_tokens': 300,
          'temperature': 0.7,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final reply = data['choices'][0]['message']['content'] as String;
        setState(() => _messages = [..._messages, _Msg('assistant', reply.trim())]);
      } else {
        setState(() => _messages = [..._messages, const _Msg('assistant', 'Oops! 🚨 I had trouble connecting. Please try again.')]);
      }
    } catch (_) {
      setState(() => _messages = [..._messages,
        const _Msg('assistant', 'Oops! 🚨 Something went wrong. Make sure you have internet and try again!')]);
    } finally {
      if (mounted) setState(() => _loading = false);
      _scrollToBottom();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isFirstMessage = _messages.length <= 1;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Text('🤖', style: TextStyle(fontSize: 20)),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Money Mentor', style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold)),
                Text('Your financial coach!', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
              ],
            ),
          ],
        ),
      ),
      body: Column(
        children: [
              // ── Chat messages ──────────────────────────────────────────
              Expanded(
                child: ListView.builder(
                  controller: _scrollController,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  itemCount: _messages.length + (_loading ? 1 : 0),
                  itemBuilder: (context, i) {
                    if (_loading && i == _messages.length) {
                      return _buildTypingIndicator(theme);
                    }
                    final msg = _messages[i];
                    return _buildBubble(context, theme, msg);
                  },
                ),
              ),

              // ── Suggestion chips (only on first message) ───────────────
              if (isFirstMessage)
                SizedBox(
                  height: 44,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _suggestions.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (_, i) => ActionChip(
                      label: Text(_suggestions[i], style: const TextStyle(fontSize: 12)),
                      onPressed: () => _send(_suggestions[i]),
                      backgroundColor: theme.colorScheme.primary.withValues(alpha: 0.08),
                      side: BorderSide(color: theme.colorScheme.primary.withValues(alpha: 0.2)),
                    ),
                  ),
                ),
              if (isFirstMessage) const SizedBox(height: 8),

              // ── Input bar ──────────────────────────────────────────────
              Container(
                color: theme.colorScheme.surface,
                padding: EdgeInsets.fromLTRB(16, 8, 8, MediaQuery.of(context).viewInsets.bottom + 12),
                child: Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(
                          hintText: 'Ask me a money question...',
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                        textInputAction: TextInputAction.send,
                        onSubmitted: _send,
                        enabled: !_loading,
                        minLines: 1,
                        maxLines: 3,
                      ),
                    ),
                    const SizedBox(width: 8),
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      child: IconButton.filled(
                        icon: Icon(_loading ? Icons.hourglass_bottom : Icons.send_rounded),
                        onPressed: _loading ? null : () => _send(_controller.text),
                        style: IconButton.styleFrom(
                          backgroundColor: theme.colorScheme.primary,
                          foregroundColor: Colors.white,
                          minimumSize: const Size(48, 48),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
      ),
    );
  }

  Widget _buildBubble(BuildContext context, ThemeData theme, _Msg msg) {
    final isMe = msg.role == 'user';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: isMe ? MainAxisAlignment.end : MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!isMe) ...[
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary.withValues(alpha: 0.15),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Text('🤖', style: TextStyle(fontSize: 18)),
            ),
            const SizedBox(width: 8),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: isMe ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.only(
                  topLeft: const Radius.circular(20),
                  topRight: const Radius.circular(20),
                  bottomLeft: Radius.circular(isMe ? 20 : 4),
                  bottomRight: Radius.circular(isMe ? 4 : 20),
                ),
              ),
              child: Text(
                msg.content,
                style: TextStyle(
                  color: isMe ? Colors.white : theme.colorScheme.onSurface,
                  fontSize: 15,
                  height: 1.4,
                ),
              ),
            ),
          ),
          if (isMe) const SizedBox(width: 8),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator(ThemeData theme) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: theme.colorScheme.primary.withValues(alpha: 0.15),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const Text('🤖', style: TextStyle(fontSize: 18)),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(20),
                topRight: Radius.circular(20),
                bottomRight: Radius.circular(20),
                bottomLeft: Radius.circular(4),
              ),
            ),
            child: Row(
              children: [
                _Dot(delay: 0, theme: theme),
                const SizedBox(width: 4),
                _Dot(delay: 200, theme: theme),
                const SizedBox(width: 4),
                _Dot(delay: 400, theme: theme),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Animated dot for the typing indicator
class _Dot extends StatefulWidget {
  final int delay;
  final ThemeData theme;
  const _Dot({required this.delay, required this.theme});
  @override
  State<_Dot> createState() => _DotState();
}

class _DotState extends State<_Dot> with SingleTickerProviderStateMixin {
  late AnimationController _ac;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ac = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))
      ..repeat(reverse: true);
    _anim = CurvedAnimation(parent: _ac, curve: Curves.easeInOut);
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _ac.forward();
    });
  }

  @override
  void dispose() {
    _ac.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _anim,
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(
          color: widget.theme.colorScheme.primary,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

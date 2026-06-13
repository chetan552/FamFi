import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'auth_provider.dart';

class SocialLoginButtons extends ConsumerStatefulWidget {
  final String actionLabel;
  const SocialLoginButtons({super.key, this.actionLabel = 'Continue'});

  @override
  ConsumerState<SocialLoginButtons> createState() => _SocialLoginButtonsState();
}

class _SocialLoginButtonsState extends ConsumerState<SocialLoginButtons> {
  bool _googleLoading = false;

  Future<void> _handleGoogleSignIn() async {
    setState(() => _googleLoading = true);
    try {
      final isNewUser = await ref.read(authProvider.notifier).signInWithGoogle();
      if (mounted && isNewUser) {
        context.go('/complete-profile');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString().replaceAll('Exception: ', ''))),
        );
      }
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isSmall = MediaQuery.sizeOf(context).width <= 380;
    final gap = isSmall ? 16.0 : 20.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Google sign-in button — white background per Google brand guidelines
        Material(
          color: Colors.white,
          elevation: 1,
          shadowColor: Colors.black.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(8),
          child: InkWell(
            onTap: _googleLoading ? null : _handleGoogleSignIn,
            borderRadius: BorderRadius.circular(8),
            child: Container(
              height: isSmall ? 44 : 48,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFDADCE0)),
              ),
              child: _googleLoading
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Color(0xFF4285F4),
                        ),
                      ),
                    )
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const _GoogleGLogo(size: 20),
                        const SizedBox(width: 10),
                        Text(
                          '${widget.actionLabel} with Google',
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            color: Color(0xFF3C4043),
                            letterSpacing: 0.1,
                          ),
                        ),
                      ],
                    ),
            ),
          ),
        ),

        SizedBox(height: gap),

        Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Text(
                'or',
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  fontSize: 13,
                ),
              ),
            ),
            const Expanded(child: Divider()),
          ],
        ),

        SizedBox(height: gap),
      ],
    );
  }
}

// Google G logo drawn with 4 brand-colored arcs + horizontal crossbar
class _GoogleGLogo extends StatelessWidget {
  const _GoogleGLogo({this.size = 20});
  final double size;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(painter: _GoogleGPainter()),
    );
  }
}

class _GoogleGPainter extends CustomPainter {
  static const _blue = Color(0xFF4285F4);
  static const _red = Color(0xFFEA4335);
  static const _yellow = Color(0xFFFBBC05);
  static const _green = Color(0xFF34A853);

  @override
  void paint(Canvas canvas, Size size) {
    final w = size.width;
    final h = size.height;
    final sw = w * 0.175; // stroke width
    final r = (w / 2) - sw / 2;
    final center = Offset(w / 2, h / 2);
    final rect = Rect.fromCircle(center: center, radius: r);

    Paint arc(Color c) => Paint()
      ..color = c
      ..strokeWidth = sw
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.butt;

    // 4 quarter arcs (clockwise from top)
    // -π/2 = 12 o'clock, 0 = 3 o'clock, π/2 = 6 o'clock, π = 9 o'clock
    canvas.drawArc(rect, -math.pi / 2, math.pi / 2, false, arc(_blue));   // top → right
    canvas.drawArc(rect, 0, math.pi / 2, false, arc(_green));              // right → bottom
    canvas.drawArc(rect, math.pi / 2, math.pi / 2, false, arc(_yellow));  // bottom → left
    canvas.drawArc(rect, math.pi, math.pi / 2, false, arc(_red));         // left → top

    // Erase the G opening on the right (white arc erases ~75° centered at 3 o'clock)
    // This works because the button has a white background
    canvas.drawArc(
      rect,
      -math.pi * 5 / 24, // -37.5°
      math.pi * 5 / 12,  // 75°
      false,
      Paint()
        ..color = Colors.white
        ..strokeWidth = sw + 1
        ..style = PaintingStyle.stroke
        ..strokeCap = StrokeCap.butt,
    );

    // Blue horizontal crossbar from center to right edge
    canvas.drawLine(
      Offset(w / 2, h / 2),
      Offset(w - sw / 2, h / 2),
      Paint()
        ..color = _blue
        ..strokeWidth = sw * 0.85
        ..strokeCap = StrokeCap.square,
    );
  }

  @override
  bool shouldRepaint(_) => false;
}

// lib/features/dashboard/widgets/ai_processing_animation.dart
import 'package:flutter/material.dart';
import 'dart:math' as math;

class AIProcessingAnimation extends StatefulWidget {
  final Color primaryColor;
  final Color accentColor;

  const AIProcessingAnimation({
    super.key,
    this.primaryColor = const Color(0xFF0A1930),
    this.accentColor = const Color(0xFFD4AF37),
  });

  @override
  State<AIProcessingAnimation> createState() => _AIProcessingAnimationState();
}

class _AIProcessingAnimationState extends State<AIProcessingAnimation> with TickerProviderStateMixin {
  late AnimationController _pulseController;
  late AnimationController _orbitController;
  late AnimationController _floatController;

  final math.Random _random = math.Random();
  final List<Particle> _particles = [];

  @override
  void initState() {
    super.initState();

    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _orbitController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 8),
    )..repeat();

    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    )..repeat(reverse: true);

    // Generate random luxury particles (circles and diamonds)
    for (int i = 0; i < 15; i++) {
      _particles.add(Particle(
        angle: _random.nextDouble() * 2 * math.pi,
        radius: 60 + _random.nextDouble() * 80,
        size: 4 + _random.nextDouble() * 8,
        speed: 0.2 + _random.nextDouble() * 0.8,
        isCircle: _random.nextBool(),
      ));
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _orbitController.dispose();
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        SizedBox(
          height: 200,
          width: 200,
          child: AnimatedBuilder(
            animation: Listenable.merge([_pulseController, _orbitController, _floatController]),
            builder: (context, child) {
              return Stack(
                alignment: Alignment.center,
                children: [
                  // Outer glowing pulse
                  Container(
                    width: 100 + (_pulseController.value * 30),
                    height: 100 + (_pulseController.value * 30),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: widget.accentColor.withOpacity(0.1 - (_pulseController.value * 0.05)),
                    ),
                  ),
                  // Inner solid core
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: widget.primaryColor,
                      boxShadow: [
                        BoxShadow(
                          color: widget.accentColor.withOpacity(0.3),
                          blurRadius: 20,
                          spreadRadius: _pulseController.value * 10,
                        )
                      ],
                    ),
                    child: const Icon(Icons.auto_awesome, color: Colors.white, size: 36),
                  ),
                  // Orbiting geometric particles
                  ..._particles.map((p) {
                    final currentAngle = p.angle + (_orbitController.value * 2 * math.pi * p.speed);
                    final floatOffset = math.sin(_floatController.value * math.pi + p.angle) * 10;
                    final x = math.cos(currentAngle) * p.radius;
                    final y = math.sin(currentAngle) * p.radius + floatOffset;

                    return Transform.translate(
                      offset: Offset(x, y),
                      child: Transform.rotate(
                        angle: _orbitController.value * 2 * math.pi * (p.isCircle ? 0 : 1),
                        child: Container(
                          width: p.size,
                          height: p.size,
                          decoration: BoxDecoration(
                            shape: p.isCircle ? BoxShape.circle : BoxShape.rectangle,
                            color: widget.accentColor.withOpacity(0.6 + (_pulseController.value * 0.4)),
                            borderRadius: p.isCircle ? null : BorderRadius.circular(2),
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ],
              );
            },
          ),
        ),
        const SizedBox(height: 32),
        Text(
          'V-SENSE AI',
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.w900,
            color: widget.primaryColor,
            letterSpacing: 4,
          ),
        ),
        const SizedBox(height: 12),
        const Text(
          'Synthesizing Forensic Audit...',
          style: TextStyle(color: Colors.grey, fontSize: 13, letterSpacing: 1.2),
        ),
      ],
    );
  }
}

class Particle {
  final double angle;
  final double radius;
  final double size;
  final double speed;
  final bool isCircle;

  Particle({
    required this.angle,
    required this.radius,
    required this.size,
    required this.speed,
    required this.isCircle,
  });
}
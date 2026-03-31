import 'package:flutter/services.dart';

Future<void> enterFullscreen() async {
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
}

Future<void> exitFullscreen() async {
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
}

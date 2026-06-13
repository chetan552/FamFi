import 'dart:js_interop';

@JS('document.documentElement.requestFullscreen')
external JSPromise _requestFullscreen();

@JS('document.exitFullscreen')
external JSPromise _exitFullscreen();

Future<void> enterFullscreen() => _requestFullscreen().toDart;

Future<void> exitFullscreen() => _exitFullscreen().toDart;

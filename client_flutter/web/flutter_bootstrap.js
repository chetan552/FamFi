{{flutter_js}}
{{flutter_build_config}}

const buildVersion = '{{flutter_service_worker_version}}';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

if (window._flutter?.buildConfig?.builds) {
  for (const build of window._flutter.buildConfig.builds) {
    if (build.mainJsPath) {
      build.mainJsPath = `${build.mainJsPath}?v=${buildVersion}`;
    }
  }
}

_flutter.loader.load();

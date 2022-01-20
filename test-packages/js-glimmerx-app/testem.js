module.exports = {
  framework: 'qunit',
  test_page: 'dist/tests/index.html',
  routes: {
    '/tests.bundle.js': 'dist/tests.bundle.js',
    '/public': 'dist/public',
    '/images': 'dist/images',
  },
  on_start: {
    command: 'webpack',
    wait_for_text: 'Built at:',
  },
  watch_files: ['dist/tests.bundle.js'],
  browser_start_timeout: 120,
  browser_args: {
    Chrome: {
      ci: [
        // --no-sandbox is needed when running Chrome inside a container
        process.env.CI ? '--no-sandbox' : null,
        '--headless',
        '--disable-dev-shm-usage',
        '--disable-software-rasterizer',
        '--mute-audio',
        '--remote-debugging-port=0',
        '--window-size=1440,900',
      ].filter(Boolean),
    },
  },
  launch_in_ci: ['Chrome'],
  launch_in_dev: ['Chrome'],
};

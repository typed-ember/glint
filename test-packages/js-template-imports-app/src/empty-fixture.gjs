// This file is intentionally empty.
// It exists as a hack to get around some issues when testing our TS Plugin
// within tsserver harness where, even though many of our tests are only
// updating tsserver's in-memory content for a file, tsserver still needs
// the file to exist in the file system in order for things like References
// and other language features to work properly.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open a folder as a vault; the last vault reopens at launch.
- Note explorer listing notes by title, with folders that fold.
- Create notes and folders (`Space n`), named from their title.
- Reading and editing panes, side by side, with Helix-style shortcuts
  (`Space ?`, `Space e`, `Ctrl-w v`…).

- `musubi` Typst package: `note-link` for links between notes, `card` for
  flashcards, `todo` and `done` for tasks. Notes using it still compile with
  the Typst command-line tool.

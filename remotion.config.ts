import {Config} from '@remotion/cli/config';

// Main algorithm scenes are deterministic SVG vector animations.
// They do not need a Chromium WebGL backend.
Config.setVideoImageFormat('jpeg');

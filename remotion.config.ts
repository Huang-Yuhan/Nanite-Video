import {Config} from '@remotion/cli/config';

// WebGL is needed for @remotion/three when rendering via Chromium.
Config.setChromiumOpenGlRenderer('angle');

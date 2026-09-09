export const CAPTURE_MODE_QUERY_PARAM = "cmmCapture";
export const CAPTURE_MODE_QUERY_VALUE = "1";

export const CAPTURE_MODE_INITIALIZER_SCRIPT = `(() => {
  const queryParam = ${JSON.stringify(CAPTURE_MODE_QUERY_PARAM)};
  const enabledValue = ${JSON.stringify(CAPTURE_MODE_QUERY_VALUE)};

  try {
    const enabled = new URLSearchParams(window.location.search).get(queryParam) === enabledValue;
    if (enabled) {
      document.documentElement.dataset.cmmCaptureMode = "true";
    } else {
      delete document.documentElement.dataset.cmmCaptureMode;
    }
  } catch {
    delete document.documentElement.dataset.cmmCaptureMode;
  }
})();`;

export function CaptureModeInitializer() {
  return (
    <script
      id="cleanmymap-capture-mode-initializer"
      dangerouslySetInnerHTML={{ __html: CAPTURE_MODE_INITIALIZER_SCRIPT }}
    />
  );
}

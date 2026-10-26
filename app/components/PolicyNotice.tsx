// Footer shown at the bottom of the app's pages, so every merchant sees the
// privacy policy notice. The policy is a public page, so it opens in a new tab
// outside the embedded admin.
export function PolicyNotice() {
  return (
    <s-stack alignItems="center" paddingBlock="large">
      <s-text color="subdued">
        By using Taggly you agree to the{" "}
        <s-link href="/privacy" target="_blank">
          Privacy Policy
        </s-link>
        .
      </s-text>
    </s-stack>
  );
}

import type { MetaFunction } from "react-router";

import styles from "./styles.module.css";

// Public pricing and help page, linked from the App Store listing. Keep it in
// sync with the plan in the Partner Dashboard (#28), the plan check (#47) and
// the privacy policy.
const CONTACT_EMAIL = "fayzandotcom@hotmail.com";

export const meta: MetaFunction = () => [{ title: "Pricing and help · Order Tagger" }];

export default function Pricing() {
  return (
    <main className={styles.page}>
      <h1>Order Tagger pricing and help</h1>

      <h2>Standard plan</h2>
      <p className={styles.price}>
        $20 USD per month, with a 30-day free trial
      </p>
      <ul>
        <li>Up to 100 tagging rules</li>
        <li>Tag orders by order total, product tag or discount code</li>
        <li>Automatic tagging of every new order</li>
        <li>History of recently tagged orders</li>
      </ul>
      <p>
        Billing goes through Shopify and appears on your Shopify bill.
        Applicable taxes may be added.
      </p>

      <h2>Free trial</h2>
      <ul>
        <li>
          When you first open Order Tagger, Shopify asks you to approve the
          Standard plan. Your 30-day free trial starts then.
        </li>
        <li>You aren&apos;t charged during the trial.</li>
        <li>
          After 30 days, Shopify charges $20 per month until you uninstall the
          app.
        </li>
        <li>
          Shopify keeps track of trial days used, so reinstalling the app
          doesn&apos;t start a new trial.
        </li>
      </ul>

      <h2>Rule limit</h2>
      <p>
        The Standard plan includes up to 100 rules. Every rule counts, whether
        it&apos;s enabled or disabled. To add a rule when you&apos;re at the
        limit, delete one first.
      </p>

      <h2>Without an active plan</h2>
      <p>
        If your plan ends or isn&apos;t started (for example, you didn&apos;t
        approve the plan, or the subscription was cancelled):
      </p>
      <ul>
        <li>Opening Order Tagger takes you to Shopify&apos;s plan page.</li>
        <li>New orders aren&apos;t tagged.</li>
        <li>Tags already added to your orders stay on them.</li>
        <li>
          Your rules and tagging history are kept for 30 days. Approve the
          Standard plan in that time and everything continues where it left
          off. If the app is still installed and a paid plan hasn&apos;t been
          started after 30 days, we delete them.
        </li>
      </ul>

      <h2>Cancelling</h2>
      <p>
        To cancel, uninstall Order Tagger from Settings → Apps in your Shopify
        admin. Shopify cancels the subscription at the end of your current
        free trial or billing period. 48 hours after you uninstall, we delete
        all of your store&apos;s rules and tagging history. Tags already added
        to your orders aren&apos;t removed.
      </p>

      <h3>Reinstalling</h3>
      <p>
        If you reinstall Order Tagger before your free trial or billing period
        ends, your Standard plan stays active until that date, so you
        don&apos;t need to approve it again. After that date, Order Tagger
        asks you to approve the Standard plan again. Reinstalling doesn&apos;t
        start a new free trial.
      </p>

      <h2>Common questions</h2>
      <h3>Does Order Tagger tag existing orders?</h3>
      <p>No. It tags orders created after the app is installed.</p>

      <h3>Can one order get several tags?</h3>
      <p>
        Yes. An order gets the tag of every enabled rule it matches. If several
        rules add the same tag, it&apos;s added once.
      </p>

      <h3>What does Order Tagger do with my customers&apos; data?</h3>
      <p>
        It uses only order totals, product tags and discount codes, and never
        stores customer names, emails, phone numbers or addresses. See the{" "}
        <a href="/privacy">privacy policy</a>.
      </p>

      <h2>Help</h2>
      <p>
        Questions about pricing or using the app:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </main>
  );
}

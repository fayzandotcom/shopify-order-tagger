import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect } from "react-router";

import { COMPANY } from "../../company";
import styles from "./styles.module.css";

export const meta: MetaFunction = () => [{ title: "Order Tagger" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return null;
};

// Public landing page. Installation starts from Shopify, so there's no shop
// domain form here (App Store requirement 2.3.1).
export default function App() {
  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Order Tagger</h1>
        <p className={styles.text}>
          Tag new orders automatically, based on simple rules you set.
        </p>
        <p className={styles.text}>
          Install Order Tagger from the Shopify App Store, then open it from
          Apps in your Shopify admin.
        </p>
        <ul className={styles.list}>
          <li>
            <strong>Simple rules</strong>. Tag orders by order total, product
            tag or discount code, for example total over 100 → high-value.
          </li>
          <li>
            <strong>Automatic tagging</strong>. Every new order is checked
            against your rules and tagged within seconds.
          </li>
          <li>
            <strong>Activity history</strong>. See which orders were tagged,
            with which tags, and by which rules.
          </li>
        </ul>
        <p className={styles.text}>
          <a href="/pricing">Pricing and help</a> ·{" "}
          <a href="/privacy">Privacy policy</a>
        </p>
        <p>
          Created and operated by <a href={COMPANY.url}>{COMPANY.name}</a>
        </p>
      </div>
    </div>
  );
}

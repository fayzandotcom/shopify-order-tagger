import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { redirect, Form, useLoaderData } from "react-router";

import { login } from "../../shopify.server";

import styles from "./styles.module.css";

export const meta: MetaFunction = () => [{ title: "Order Tagger" }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);

  if (url.searchParams.get("shop")) {
    throw redirect(`/app?${url.searchParams.toString()}`);
  }

  return { showForm: Boolean(login) };
};

export default function App() {
  const { showForm } = useLoaderData<typeof loader>();

  return (
    <div className={styles.index}>
      <div className={styles.content}>
        <h1 className={styles.heading}>Order Tagger</h1>
        <p className={styles.text}>
          Tag new orders automatically, based on simple rules you set.
        </p>
        {showForm && (
          <Form className={styles.form} method="post" action="/auth/login">
            <label className={styles.label}>
              <span>Shop domain</span>
              <input className={styles.input} type="text" name="shop" />
              <span>e.g: my-shop-domain.myshopify.com</span>
            </label>
            <button className={styles.button} type="submit">
              Log in
            </button>
          </Form>
        )}
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
      </div>
    </div>
  );
}

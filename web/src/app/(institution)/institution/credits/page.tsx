import { redirect } from "next/navigation";

/**
 * Legacy credit-wallet purchase UI is retired. Centres buy test sets instead
 * (`/institution/mocks/shop`). Keep this redirect so old bookmarks/payment
 * return URLs still land somewhere useful.
 */
export default function InstitutionCreditsRedirectPage() {
  redirect("/institution/mocks/shop");
}

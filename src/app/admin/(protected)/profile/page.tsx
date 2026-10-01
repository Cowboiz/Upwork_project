import { AccountProfilePage } from "@/components/account/account-profile-page";

type AdminProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function AdminProfilePage({
  searchParams,
}: AdminProfilePageProps) {
  const params = await searchParams;

  return <AccountProfilePage searchParams={params} />;
}

import { AccountProfilePage } from "@/components/account/account-profile-page";

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    updated?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = await searchParams;
  return <AccountProfilePage searchParams={params} />;
}

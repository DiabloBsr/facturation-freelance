import { CompanyForm } from "@/components/settings/company-form";
import { IdentifiersForm } from "@/components/settings/identifiers-form";
import { getCompany, getLegalIdentifiers } from "@/server/settings";
import { saveIdentifiers, updateCompany } from "@/server/actions/settings";

export default async function ParametresIdentitePage() {
  const [company, identifiers] = await Promise.all([getCompany(), getLegalIdentifiers()]);

  return (
    <div className="flex flex-col gap-5">
      <CompanyForm
        action={updateCompany}
        values={{
          legalName: company.legalName,
          tradeName: company.tradeName,
          legalForm: company.legalForm,
          activity: company.activity,
          slogan: company.slogan,
          addressLine1: company.addressLine1,
          addressLine2: company.addressLine2,
          postalCode: company.postalCode,
          city: company.city,
          region: company.region,
          country: company.country,
          phone: company.phone,
          mobile: company.mobile,
          email: company.email,
          website: company.website,
          logoData: company.logoData,
          stampData: company.stampData,
          signatureData: company.signatureData,
          signatureName: company.signatureName,
          signatureRole: company.signatureRole,
        }}
      />

      <IdentifiersForm
        action={saveIdentifiers}
        identifiers={identifiers.map((identifier) => ({
          label: identifier.label,
          value: identifier.value,
          showOnPdf: identifier.showOnPdf,
        }))}
      />
    </div>
  );
}

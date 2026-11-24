import { useEffect, useState } from "react";
import CheckboxInput from "./CheckboxInput";
import TextInput, { requiredText } from "./TextInput";

interface CompanyInputProps {
  donateAsCompanyText: string | null;
  companyDonation: boolean;
  setCompanyDonation: (val: boolean) => void;
  companyNameText: string | null;
  companyName: string;
  setCompanyName: (name: string) => void;
  companyCodeText: string | null;
  companyCode: string;
  setCompanyCode: (code: string) => void;
  setValidity: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** "<%= field %> is required": under a field left empty. */
  requiredFieldText?: string | null;
}

export default function CompanyInput({
  donateAsCompanyText,
  companyDonation,
  setCompanyDonation,
  companyNameText,
  companyName,
  setCompanyName,
  companyCodeText,
  companyCode,
  setCompanyCode,
  setValidity,
  requiredFieldText,
}: CompanyInputProps) {
  const [companyValidity, setCompanyValidity] = useState<
    Record<string, boolean>
  >({});

  // Valid as a whole, and each field too, for saying which one is missing:
  // all of it, for a donation that isn't a company's.
  useEffect(() => {
    const companyNameValid =
      !companyDonation || Boolean(companyValidity.companyName);
    const companyCodeValid =
      !companyDonation || Boolean(companyValidity.companyCode);
    setValidity((ready) => ({
      ...ready,
      company: companyNameValid && companyCodeValid,
      companyName: companyNameValid,
      companyCode: companyCodeValid,
    }));
  }, [companyDonation, companyName, companyCode, companyValidity, setValidity]);

  return (
    <>
      <CheckboxInput
        name="companyDonation"
        label={donateAsCompanyText}
        value={companyDonation}
        setValue={(companyDonation) => setCompanyDonation(companyDonation)}
      />
      {companyDonation && (
        <>
          <TextInput
            name="companyName"
            value={companyName}
            setValue={setCompanyName}
            setValidity={setCompanyValidity}
            isValid={(value) => value !== ""}
            label={companyNameText}
            errorText={requiredText(requiredFieldText, companyNameText)}
            autoComplete="company-name"
            maxLength={128}
          />
          <TextInput
            name="companyCode"
            value={companyCode}
            setValue={setCompanyCode}
            setValidity={setCompanyValidity}
            isValid={(value) => value !== ""}
            label={companyCodeText}
            errorText={requiredText(requiredFieldText, companyCodeText)}
            autoComplete="company-registry-code"
            maxLength={128}
          />
        </>
      )}
    </>
  );
}

import { useEffect, useState } from "react";
import CheckboxInput from "./CheckboxInput";
import TextInput, { requiredText } from "./TextInput";
import EmailInput from "./EmailInput";
import TextareaInput from "./TextareaInput";

interface DedicationInputProps {
  dedicateDonationText: string | null;
  dedicateDonation: boolean;
  setDedicateDonation: (val: boolean) => void;
  dedicationNameText: string | null;
  dedicationName: string;
  setDedicationName: (name: string) => void;
  dedicationEmailText: string | null;
  dedicationEmail: string;
  setDedicationEmail: (email: string) => void;
  dedicationMessageText: string | null;
  dedicationMessage: string;
  setDedicationMessage: (message: string) => void;
  setValidity: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** "<%= field %> is required": under a field left empty. */
  requiredFieldText?: string | null;
  /** Under an email address that isn't one. */
  emailInvalidText?: string | null;
}

export default function DedicationInput({
  dedicateDonationText,
  dedicateDonation,
  setDedicateDonation,
  dedicationNameText,
  dedicationName,
  setDedicationName,
  dedicationEmailText,
  dedicationEmail,
  setDedicationEmail,
  dedicationMessageText,
  dedicationMessage,
  setDedicationMessage,
  setValidity,
  requiredFieldText,
  emailInvalidText,
}: DedicationInputProps) {
  const [dedicationValidity, setDedicationValidity] = useState<
    Record<string, boolean>
  >({});

  // Valid as a whole, and each field too, for saying which one is missing:
  // all of it, for a donation that isn't dedicated.
  useEffect(() => {
    const dedicationNameValid =
      !dedicateDonation || Boolean(dedicationValidity.dedicationName);
    const dedicationEmailValid =
      !dedicateDonation || Boolean(dedicationValidity.dedicationEmail);
    setValidity((ready) => ({
      ...ready,
      dedication: dedicationNameValid && dedicationEmailValid,
      dedicationName: dedicationNameValid,
      dedicationEmail: dedicationEmailValid,
    }));
  }, [
    dedicateDonation,
    dedicationName,
    dedicationEmail,
    dedicationValidity,
    setValidity,
  ]);

  return (
    <>
      <CheckboxInput
        name="dedicateDonation"
        label={dedicateDonationText}
        value={dedicateDonation}
        setValue={(dedicateDonation) => setDedicateDonation(dedicateDonation)}
      />
      {dedicateDonation && (
        <>
          <TextInput
            name="dedicationName"
            value={dedicationName}
            setValue={setDedicationName}
            setValidity={setDedicationValidity}
            isValid={(value) => value !== ""}
            label={dedicationNameText}
            errorText={requiredText(requiredFieldText, dedicationNameText)}
            maxLength={128}
          />
          <EmailInput
            name="dedicationEmail"
            email={dedicationEmail}
            setEmail={setDedicationEmail}
            setValidity={setDedicationValidity}
            emailText={dedicationEmailText}
            requiredFieldText={requiredFieldText}
            invalidText={emailInvalidText}
          />
          <TextareaInput
            name="dedicationMessage"
            value={dedicationMessage}
            setValue={setDedicationMessage}
            setValidity={setDedicationValidity}
            isValid={() => true}
            label={dedicationMessageText}
            maxLength={1024}
            rows={4}
          />
        </>
      )}
    </>
  );
}

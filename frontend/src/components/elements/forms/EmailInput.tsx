import { validateEmail } from "@/utils/string";
import TextInput, { requiredText } from "./TextInput";

interface EmailInputProps {
  name?: string;
  emailText: string | null;
  email: string;
  setEmail: (email: string) => void;
  setValidity: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  autoComplete?: string;
  /** "<%= field %> is required": under it left empty. */
  requiredFieldText?: string | null;
  /** Under an address that isn't one. */
  invalidText?: string | null;
}

export default function EmailInput({
  name = "email",
  emailText,
  email,
  setEmail,
  setValidity,
  autoComplete = "email",
  requiredFieldText,
  invalidText,
}: EmailInputProps) {
  return (
    <TextInput
      name={name}
      value={email}
      setValue={setEmail}
      setValidity={setValidity}
      isValid={(value) => validateEmail(value)}
      label={emailText}
      errorText={
        email === "" ? requiredText(requiredFieldText, emailText) : invalidText
      }
      autoComplete={autoComplete}
      maxLength={256}
    />
  );
}

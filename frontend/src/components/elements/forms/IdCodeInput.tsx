import { validateIdCode } from "@/utils/estonia";
import TextInput from "./TextInput";

interface IdCodeInputProps {
  idCodeText: string | null;
  idCodeDescription?: string | null;
  idCode: string;
  setIdCode: (idCode: string) => void;
  setValidity: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  /** Under a code that isn't one (it may be left empty). */
  invalidText?: string | null;
}

export default function IdCodeInput({
  idCodeText,
  idCodeDescription,
  idCode,
  setIdCode,
  setValidity,
  invalidText,
}: IdCodeInputProps) {
  return (
    <TextInput
      name="idCode"
      value={idCode}
      setValue={setIdCode}
      setValidity={setValidity}
      isValid={(value) => value === "" || validateIdCode(value)}
      label={idCodeText}
      errorText={invalidText}
      autoComplete="isikukood"
      maxLength={11}
      description={idCodeDescription}
    />
  );
}

import { pickFileFromDevice } from "./pickFileFromDevice";

export async function pickImageFromDevice(): Promise<string | null> {
  return pickFileFromDevice("image/*");
}

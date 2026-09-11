import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/** Progress photos are copied into the app's own document directory and never leave the device. */
export async function pickProgressPhoto(source: 'camera' | 'library', name: string): Promise<string | null> {
  const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85, allowsEditing: false };
  let res: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
    res = await ImagePicker.launchCameraAsync(opts);
  } else {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    res = await ImagePicker.launchImageLibraryAsync(opts);
  }
  if (res.canceled || !res.assets?.[0]) return null;
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${name}.jpg`);
  if (dest.exists) dest.delete();
  new File(res.assets[0].uri).copy(dest);
  return dest.uri;
}

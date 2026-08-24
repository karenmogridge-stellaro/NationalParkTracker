import * as Contacts from 'expo-contacts';

export class ContactsPermissionDeniedError extends Error {
  constructor() {
    super('Contacts permission was denied.');
    this.name = 'ContactsPermissionDeniedError';
  }
}

/** Reads phone numbers and emails from the device's contact list, for matching
 * against registered users. Throws ContactsPermissionDeniedError if denied. */
export async function readDeviceContacts(): Promise<{ phones: string[]; emails: string[] }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new ContactsPermissionDeniedError();
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails],
  });

  const phones: string[] = [];
  const emails: string[] = [];
  data.forEach((contact) => {
    contact.phoneNumbers?.forEach((entry) => {
      if (entry.number) phones.push(entry.number);
    });
    contact.emails?.forEach((entry) => {
      if (entry.email) emails.push(entry.email);
    });
  });

  return { phones, emails };
}

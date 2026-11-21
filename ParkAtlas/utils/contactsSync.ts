import * as Contacts from 'expo-contacts';

export class ContactsPermissionDeniedError extends Error {
  constructor() {
    super('Contacts permission was denied.');
    this.name = 'ContactsPermissionDeniedError';
  }
}

/** Reads phone numbers, emails, and display names from the device's contact list, for matching
 * against registered users. Names are compared on-device and never uploaded. Throws ContactsPermissionDeniedError if denied. */
export type DeviceContact = {
  id: string;
  name: string;
  phoneNumbers: string[];
  emails: string[];
};

export async function readDeviceContacts(): Promise<{ phones: string[]; emails: string[]; names: string[]; contacts: DeviceContact[] }> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new ContactsPermissionDeniedError();
  }

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Emails, Contacts.Fields.Name, Contacts.Fields.FirstName, Contacts.Fields.LastName],
  });

  const phones: string[] = [];
  const emails: string[] = [];
  const names: string[] = [];
  const contacts: DeviceContact[] = [];
  data.forEach((contact) => {
    const phoneNumbers: string[] = [];
    contact.phoneNumbers?.forEach((entry) => {
      if (entry.number) {
        phones.push(entry.number);
        phoneNumbers.push(entry.number);
      }
    });
    const contactEmails: string[] = [];
    contact.emails?.forEach((entry) => {
      if (entry.email) {
        emails.push(entry.email);
        contactEmails.push(entry.email);
      }
    });
    const full = (contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ')).trim();
    if (full) {
      names.push(full);
      contacts.push({
        id: contact.id || `${full}-${phoneNumbers[0] || contactEmails[0] || contacts.length}`,
        name: full,
        phoneNumbers,
        emails: contactEmails,
      });
    }
  });

  return { phones, emails, names, contacts };
}

/**
 * Default Citizen Profile Avatar Base64
 * Uses the default nav_account.png for a clean UI
 */
export const DEFAULT_CITIZEN_AVATAR_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAQtSURBVHhe7Z0tcBRBEEZbIpGRSCQSiURGIpFIJNxs6uIikcjISCQyEnkSiYy8KrJHZKhvWaqg9/Jzt7O7PXvvVX0ulZvp3p3pmentMQMAAAAAAAAAAAAAAAAAAACYCdfJXnndLu2J/zuYAfXSjjYLe7ep7HJT2e0jtLpe2PubpT3z/wsKoq7srZy5xcG76LseBv+/ITCbyo4zOP4/1ZX9uK7sjf8tCEQz1D9+mN9Xq58f7bn/bZiYzcJebpJdbXFYfiVba5TxbYCJ0NBcJ7vpOGpgERsEQM73jhlTdbIPvk0wEhr2p3jzt4jpYGy0Rh9tzn9Aegjrhb3wbYQBqSv75h0xpbRMZCdxJNp1fscJU4ugcCRyb/JkU7IrRoGB0VvWMXwsnfk2Q0a0N7/F6HGUbM0oMBBN5O8NHlA6WvZthwxo08UbO6Lqyj77tkMGoi397lSyK9926Inm1Y6hA4sTw8yUMv//FXFAZmRQb+TIUjaS7wP0YOpTv13FKWFm2qTOjqHDKtmp7wP0oE3w7Bo6qngA8kIMcOBoWeWNHFl1ste+D9CD9dKeeiNHFgkiA6CkC2/oiFKGEAdCA6CjVm/skEp24dsOGWhy/72xA4oviAYkSiLoXdLwr3jFtxsy8auyT97okVQn++LbDBlpVgNBR4EmPXxpR77NkJmoeYEanXxbYQCa3IBgowBv/8hoazjIZ2GNiPwnINAJIangUzH1qoCoPwDKwvWOGUNyPlu+QRh7ZUDEH5AmZ+BP+ZaOw3JJgScBX2C0UaS3c4gVgqYalnqF0FQMO7Fz78R9pLmeopGFohGhyShOdrHLqCCnK62LNx4AAAAAAAAAACAy+pawPSH82uMSCRWkvNS3/nzqFZy2htBxc2Az1CdkykM8sXNtLZP7HwDt07el4/SWdx02sFS1TL/PQdHIyPFDHfnurRM750EYmJCO9+JByE8RjvfiQchDKeVh79EZiaN70FYEmSS4yy0Fi4wGOzDqHYBjKdmaZNJHMIMh/15pn4IpYQtzGvIfoRVTwj/ojSimFHwmabeSh6DlgN58r9XBbynnyt0vWJcHGxMUU/ZtYB3kF8Zzj/Z31UHdM6Q6ut4AyG5V8MLbanZErO8TRQdRZ4h5/wHNucys0rSKOtGbSgt76W03CxTtdjqLtmnlbVc8Ua98j6pZXUXfbvUOk6g5VyVbzyYgDFTPrzTNo/5gm1/vO4ceUrKr4reJS7nkIaqKTyLhsKe3Lr1Ni4Lgr5+KvoCqtLv+oqrYOwjHLt86VxVbllb72r4zaHcpXc7btgg2lX33nUG7S3GAt2142s+1O51B+0nxlLdxaFRQwXcC9dKxt3FoSrvuPbqKu45eDfadQD2U7NTbODQ8AJlV3AOgGCDZKcojTanexgAAAAAAAAAAAAAAAAAAAAAAAAAAAA2/AZEE/SvcgbJEAAAAAElFTkSuQmCC';

/**
 * Returns the appropriate image source for the citizen profile avatar.
 * If the user has uploaded an image, it returns that image.
 * Otherwise, it falls back to a clean default user icon.
 */
export const getCitizenAvatarSource = (base64String?: string | null) => {
  if (
    !base64String ||
    base64String === DEFAULT_CITIZEN_AVATAR_BASE64 ||
    base64String.trim() === ''
  ) {
    return require('../../assets/icons/nav_account.png');
  }
  
  const cleanString = base64String.replace(/[\r\n]+/g, '').trim();

  if (cleanString.startsWith('http') || cleanString.startsWith('https')) {
    return { uri: cleanString };
  }
  
  if (cleanString.startsWith('data:image')) {
    return { uri: cleanString };
  }
  return { uri: `data:image/jpeg;base64,${cleanString}` };
};

/**
 * Ensures that if a user clears their profile picture or hasn't set one,
 * we send the default base64 avatar to the backend to satisfy any requirements.
 */
export const getCleanBase64 = (base64String?: string | null) => {
  if (!base64String || base64String.trim() === '') {
    return DEFAULT_CITIZEN_AVATAR_BASE64;
  }
  return base64String;
};

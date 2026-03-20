export interface PlaceDetails {
    lat:             number;
    lng:             number;
    formattedAddress: string;
    placeId:         string;
    components: {
        streetNumber?: string;
        route?:        string;
        city?:         string;
        state?:        string;
        country?:      string;
        postalCode?:   string;
    };
}

export interface AddressFields {
  addressLine1: string;
  city: string;
  province: string;
  postalCode: string;
  placeId: string;
  description: string;
}

export interface AddressLocation {
    id: string;
    lat: number;
    lng: number;
    address: string;
    cellId: string;
}
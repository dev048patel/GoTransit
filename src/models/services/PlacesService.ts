/* PlacesService — wraps Google Places API (New) for address autocomplete and place coordinates.
   Replaces the legacy AutocompleteService/Geocoder calls made by use-places-autocomplete. */

// Regina city centre — used to bias autocomplete results toward local places
const REGINA_CENTER = { lat: 50.4452, lng: -104.6189 };
const SEARCH_RADIUS_METERS = 50 * 1000;

// Same shape as the legacy AutocompletePrediction fields the views read
export interface PlaceSuggestion {
    place_id: string;
    description: string;
    structured_formatting: {
        main_text: string;
        secondary_text: string;
    };
    prediction: google.maps.places.PlacePrediction;
}

export class PlacesService {
    // Resolves once the Places library is available (script is loaded by useMapController)
    static async load(): Promise<google.maps.PlacesLibrary> {
        return (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
    }

    static async createSessionToken(): Promise<google.maps.places.AutocompleteSessionToken> {
        const { AutocompleteSessionToken } = await PlacesService.load();
        return new AutocompleteSessionToken();
    }

    // Fetch Regina-biased suggestions for the typed text
    static async fetchSuggestions(
        input: string,
        sessionToken?: google.maps.places.AutocompleteSessionToken,
    ): Promise<PlaceSuggestion[]> {
        const { AutocompleteSuggestion } = await PlacesService.load();
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input,
            sessionToken,
            locationBias: { center: REGINA_CENTER, radius: SEARCH_RADIUS_METERS },
        });

        return suggestions
            .map(s => s.placePrediction)
            .filter((p): p is google.maps.places.PlacePrediction => !!p)
            .map(p => ({
                place_id: p.placeId,
                description: p.text.text,
                structured_formatting: {
                    main_text: p.mainText?.text ?? p.text.text,
                    secondary_text: p.secondaryText?.text ?? '',
                },
                prediction: p,
            }));
    }

    // Look up coordinates for a place. Passing the prediction keeps the autocomplete session token
    // attached, so Google bills the autocomplete + details lookup as a single session.
    static async getLocation(
        placeId: string,
        prediction?: google.maps.places.PlacePrediction,
    ): Promise<{ lat: number; lng: number }> {
        const { Place } = await PlacesService.load();
        const place = prediction ? prediction.toPlace() : new Place({ id: placeId });
        await place.fetchFields({ fields: ['location'] });
        if (!place.location) throw new Error(`No location returned for place ${placeId}`);
        return { lat: place.location.lat(), lng: place.location.lng() };
    }
}

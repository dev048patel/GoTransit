/**
This is Backend/Shared model. It is like a form with fields.
1. A bus, path, stops ....

*/

export interface Route {
    id: string;
    name: string;
    stops: string[];
}

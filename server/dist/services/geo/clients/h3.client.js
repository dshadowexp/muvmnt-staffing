"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.H3Service = void 0;
const h3 = __importStar(require("h3-js"));
// Resolution 8 — ~0.46 km cell edge length
const RESOLUTION = 8;
class H3Service {
    encode(lat, lng) {
        return h3.latLngToCell(lat, lng, RESOLUTION);
    }
    decode(cellId) {
        const [lat, lng] = h3.cellToLatLng(cellId);
        return { lat, lng };
    }
    // Returns all cells within k rings of the origin cell.
    // k is the exact gridDisk k parameter from https://h3geo.org/docs/api/traversal#griddiskdistances
    // k=0 → 1 cell (origin only)
    // k=1 → 7 cells
    // k=2 → 19 cells
    // k=n → 3n² + 3n + 1 cells
    getCellsInRing(lat, lng, k) {
        const origin = h3.latLngToCell(lat, lng, RESOLUTION);
        return h3.gridDisk(origin, k);
    }
    // Exact haversine distance in km
    distanceKm(lat1, lng1, lat2, lng2) {
        const R = 6371;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
}
exports.H3Service = H3Service;
//# sourceMappingURL=h3.client.js.map
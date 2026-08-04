// Ambient declarations only -- never compiled/shipped, tsc-only. These globals come from
// classic <script src> vendor files (vendor/maplibre, vendor/pmtiles, vendor/vosk), not modules,
// so there's no import for tsc to resolve their types from.
declare const maplibregl: any;
declare const pmtiles: any;
declare const Vosk: any;
// SheetJS/ExcelJS -- vendored, loaded lazily via loadScriptOnce() only when the user hits
// import/export Excel, never as a module import (see js/app.js)
declare const XLSX: any;
declare const ExcelJS: any;

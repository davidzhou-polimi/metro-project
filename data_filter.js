/**
 * Transit Data Filtering Script
 *
 * This script allows you to apply the exact same filters configured in the UI
 * to your datasets programmatically.
 *
 * Usage:
 * const data = { cities: [...], systems: [...], ... };
 * const filtered = filterData(data);
 */

// --- Configuration ---
const FILTER_CONFIG = [
    {
        id: "311e8ba6-04d7-4d05-bb29-316323684de3",
        logic: "AND",
        rules: [
            {
                id: "5ea9bd52-3ada-4800-857f-b214cb46a13c",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "NULL",
                useNull: true,
                caseSensitive: false,
            },
            {
                id: "9fbd4051-fcdc-4b10-bc56-bdf10f67aaa9",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "metrolink",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "f60175da-e7dd-4d74-89de-e80a083a7749",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "bus",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "5432f6cd-89e5-41a1-9320-f0d020fcc47e",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "bús",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "a5efb98c-dfc8-45b4-906d-480780a54200",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "railway",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "7ea68695-f28d-462c-9a66-6014252b944d",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "New Orleans Regional Transit Authority",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "be451d5f-c1ed-44f6-8195-c0086772fd79",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "North County Transit District",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "eb033981-657b-49d8-b621-6989d9fa26f6",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Hampton Roads Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "59aaf258-2614-417e-91b7-d2954066f092",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Minnesota Valley Transit Authority",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "86f35a51-0d0b-4089-afd7-b5a16a167020",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Transporte Metropolitano Arroyo de la Encomienda",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "7ae759dc-0787-4fa5-b2a1-c5066c6d04d4",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Maryland Transit Administration",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "3af1f68e-ba1d-469e-aa17-0f587e4f212a",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Pittsburgh Regional Transit (PRT)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "c71c4378-9783-4109-9e53-03d904cc4531",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Philadelphia Transit Company",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "d95cdff1-b6c2-41a6-b0a4-2d09c49bc5ea",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Capital MetroRail",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "fe8636d8-0d5c-4890-929b-30069fda1c14",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Capital MetroRapid",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "bdf156f9-8874-4d25-9107-b59468f2a118",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Capital MetroExpress",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "9d23c0b7-76e1-4b35-8d3a-2eabb5ab60d5",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "NJ Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "1fdf4089-374d-4016-9f6b-2ff50ed61508",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "MTA Metro-North",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "782cd4a1-8ed5-44c2-bd23-c91e69240280",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Nagoya Rinkai Rapid Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "3bd382f9-579b-48c8-bf78-3861f6a36df5",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Tokadai New Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "f0b125cb-9fcb-4026-bbe9-bb9d8f3b7509",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Ferrocarril Metropolitano de Barcelona SA",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "00384dbc-7439-4458-b128-9c50776042e8",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metrotrén Segunda Etapa",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "fdbebcc9-7ba8-49cc-ac35-1a4c38ff11c9",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metrotrén Primera Etapa",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "6449f3e5-db9d-49e7-b248-b732042e68f6",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metrolinx",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "01e90d5f-ed36-497f-be6f-956bb3b2b87b",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "GO Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "af69913a-b099-4fcb-aaea-d8176e4c1e34",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Chicago Rapid Transit Company",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "835e8866-e264-47c9-b215-2f1495e6a4b1",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Hillsborough Area Regional Transit (HART)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "85505bea-316d-405e-84ef-0b46051494bf",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Greater Richmond Transit Company",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "57467c41-528d-48fa-8a8d-9a77c67130ea",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Capital Transit Company",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "557c7d3e-6a7a-4229-a992-d5cab6d20d77",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Utah Transit Authority",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "08114f2c-89ea-46fd-a451-74bcc0b722b2",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Winnipeg Transit - MBMetroRail",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "21295667-b5f3-43c2-823d-001d674bea24",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Aichi Rapid Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "b00311b3-4275-488f-b360-2b06ae592a01",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metrohidroviário",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "b1cebcbf-6cf2-43dd-be45-deb613573c60",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metrorrodoviário",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "f7bbf617-4c79-4abe-b4cc-c48f321d2a22",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Dublin Area Rapid Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "e1df1593-7358-4b80-8aef-d531c0c83aca",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metromover",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "b65fa451-3728-44a6-a613-d489398737b1",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Saitama New Urban Transit",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "890d5b37-b793-4b95-a93b-d2cda5458a4d",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "name",
                operator: "==",
                value: "Elizabeth",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "a581eb11-fa90-4776-aa61-b9ef666a5508",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "name",
                operator: "==",
                value: "Tramlink",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "61d99b0d-e85a-46b4-ae60-8f2181e96402",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "name",
                operator: "==",
                value: "IFS Cloud Cable Car",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "5cb9120c-fc12-4699-a086-93091b39bb60",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "name",
                operator: "contains",
                value: "Ferrovia ",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "0d6a1ba6-94bd-4419-939a-edd5a112fce8",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "id",
                operator: "==",
                value: "4368",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "22525e38-b81e-4cb0-808f-c16b8d471ce2",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Gran Metropolità de Barcelona",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "0e5f5007-1f23-4696-8217-f4d6cb5771bf",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Sistema Ferroviario Metropolitano Regionale",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "cf2cd8e3-8da9-4c6f-b960-f8b6c66d8a80",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Trenes Metropolitanos",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "dd672ae1-4f83-438f-8e9b-5f8aab5c4cf5",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "system_id",
                operator: "==",
                value: "844",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "b015e831-6cf4-4241-808f-5c772641a6b2",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Market-Frankford Line",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "92194375-680d-4fe2-8a44-3b739442edc7",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Broad Street Line",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "be8e8fb9-7436-4abc-b89c-51e2f9c74e29",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Norristown High Speed Line",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "a0940c29-bd54-4aa9-9440-d50c01fcab47",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Metro Trains Melbourne",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "b93a4e63-853a-4425-b528-06d0b1f3e8d5",
                logic: "OR",
                type: "include",
                table: "lines",
                field: "system_id",
                operator: "==",
                value: "94",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "e7e35699-815a-4a49-b6cc-14f270900862",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 1 • Azul (CMSP)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "3551f4bc-3460-40c4-8731-200c56d01173",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 2 • Verde (CMSP)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "f85fdfc0-9788-4edf-a575-ce2b93a13037",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 3 • Vermelha (CMSP)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "0862cf20-2e74-405d-9a9e-d843dcafc93d",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 4 • Amarela (ViaQuatro)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "dd59cd32-2f26-4fc1-a35e-fbde8c6addb6",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 5 • Lilás (ViaMobilidade)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "cf9ff1f8-114a-4671-8bcc-cbc736c5d94c",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 6 • Laranja (LinhaUni)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "256979a1-eabe-488b-9131-02a2c368064d",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 15 • Prata (CMSP)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "a58feee8-55d9-4463-b76c-090096d0107f",
                logic: "AND",
                type: "include",
                table: "lines",
                field: "name",
                operator: "!=",
                value: "Linha 17 • Ouro (ViaMobilidade)",
                useNull: false,
                caseSensitive: true,
            },
        ],
        not: true,
    },
    {
        id: "5d774798-a76b-4ab1-a93f-0d9f15e60199",
        logic: "AND",
        rules: [
            {
                id: "d6244016-b6cb-4a9f-8f3e-7f8ca31fec63",
                logic: "OR",
                type: "include",
                table: "transport_modes",
                field: "id",
                operator: "==",
                value: "0",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "7f189283-0d7f-47ee-9f60-15d557ef21b6",
                logic: "OR",
                type: "include",
                table: "transport_modes",
                field: "id",
                operator: "==",
                value: "4",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "1ea87e41-e5c0-4ac2-86dd-13ea552c6dd1",
                logic: "OR",
                type: "include",
                table: "transport_modes",
                field: "id",
                operator: "==",
                value: "5",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "b1ed325d-5194-41ca-b73b-fb6c918d76f6",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "metro",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "b230c521-9b76-4cfb-bf11-9983612c1bf8",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "subway",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "850b4663-c689-471e-a4ba-95decf183103",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Transmilenio",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "9bdef210-b933-4974-a3e8-5eaff20353dc",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Sistema de Transporte Colectivo (STC)",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "8fc97e09-0e3e-451d-8d21-d9fe48f51ce7",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Μετρό",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "0081a5ef-14fc-4164-a51a-a5217d543870",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "transit",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "ee5e083a-c8fb-4dc5-a956-1bbd230b4d53",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "id",
                operator: "==",
                value: "844",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "25b2b98b-2893-47e1-81cb-d36b5171944f",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "CTA",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "ecff30eb-9784-4599-837d-4d4a0440f8c9",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Métro de Paris",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "16aa1a27-0946-4056-b3d7-8adea122972f",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "contains",
                value: "underground",
                useNull: false,
                caseSensitive: false,
            },
            {
                id: "e16095ab-a85e-468d-b3c1-4bdbbdab4806",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "(TfL) Other",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "8f4af833-cf3b-4b32-afc9-e11f325eb2de",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "U-Bahn",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "189cf9f6-af1b-4c3e-ba03-ced65ddeaf04",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Subte",
                useNull: false,
                caseSensitive: true,
            },
            {
                id: "5189d961-821f-4ead-a779-076ad5e35ab9",
                logic: "OR",
                type: "include",
                table: "systems",
                field: "name",
                operator: "==",
                value: "Métro d'Alger",
                useNull: false,
                caseSensitive: true,
            },
        ],
        not: false,
    },
];

// --- Helper Functions ---

const evaluateCondition = (item, rule) => {
    const itemVal = item[rule.field];
    let matches = false;

    if (rule.useNull) {
        const isNullish =
            itemVal === null || itemVal === undefined || itemVal === "";
        if (rule.operator === "==") matches = isNullish;
        else if (rule.operator === "!=") matches = !isNullish;
        else matches = false;
    } else {
        let compareVal = rule.value;
        let actualVal = itemVal;

        // Numeric conversion check
        if (typeof actualVal === "number" && !isNaN(Number(rule.value))) {
            compareVal = Number(rule.value);
        }
        // String handling
        else {
            // If not case sensitive and operation supports string comparison, lower case both
            if (
                !rule.caseSensitive &&
                (typeof actualVal === "string" ||
                    typeof compareVal === "string")
            ) {
                actualVal = String(actualVal || "").toLowerCase();
                compareVal = String(compareVal || "").toLowerCase();
            } else {
                // Ensure strings if strictly string comparison needed, otherwise leave as is
                actualVal = String(actualVal || "");
                compareVal = String(compareVal || "");
            }
        }

        switch (rule.operator) {
            case "==":
                matches = actualVal == compareVal;
                break;
            case "!=":
                matches = actualVal != compareVal;
                break;
            case ">":
                matches = actualVal > compareVal;
                break;
            case "<":
                matches = actualVal < compareVal;
                break;
            case "contains":
                matches = String(actualVal).includes(String(compareVal));
                break;
            default:
                matches = true;
        }
    }

    if (rule.type === "exclude") {
        return !matches;
    }

    return matches;
};

const evaluateGroupForTable = (row, group, table) => {
    // Only consider rules that apply to this table
    const rules = group.rules.filter((r) => r.table === table);

    // If a group has no rules for this table, we assume it's neutral (True).
    if (rules.length === 0) return true;

    // Evaluate first rule
    let result = evaluateCondition(row, rules[0]);

    // Evaluate rest
    for (let i = 1; i < rules.length; i++) {
        const rule = rules[i];
        const nextResult = evaluateCondition(row, rule);
        if (rule.logic === "OR") {
            result = result || nextResult;
        } else {
            result = result && nextResult;
        }
    }

    // Apply Group Inversion if set
    if (group.not) {
        return !result;
    }

    return result;
};

// --- Main Filter Function ---

function filterData(data) {
    // 1. Create a shallow copy structure
    const filtered = {};
    Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key])) {
            filtered[key] = [...data[key]];
        }
    });

    const groups = FILTER_CONFIG;

    if (groups.length === 0) return filtered;

    // 2. Apply Filters per table
    Object.keys(filtered).forEach((table) => {
        const relevantGroups = groups.filter((g) =>
            g.rules.some((r) => r.table === table)
        );
        if (relevantGroups.length === 0) return;

        filtered[table] = filtered[table].filter((row) => {
            // Group Logic: (G1) [Logic] (G2) ...
            // Note: The UI currently defaults to sequential evaluation where previous logic is implicitly chained.

            let cumulativeResult = evaluateGroupForTable(
                row,
                relevantGroups[0],
                table
            );

            for (let i = 1; i < relevantGroups.length; i++) {
                const group = relevantGroups[i];
                const groupResult = evaluateGroupForTable(row, group, table);

                if (group.logic === "OR") {
                    cumulativeResult = cumulativeResult || groupResult;
                } else {
                    cumulativeResult = cumulativeResult && groupResult;
                }
            }

            return cumulativeResult;
        });
    });

    // 3. Cascade Logic (Referential Integrity - Downwards)

    // -- Cascade from Cities --
    if (filtered.cities) {
        const validCityIds = new Set(filtered.cities.map((c) => c.id));
        if (filtered.systems)
            filtered.systems = filtered.systems.filter((s) =>
                validCityIds.has(s.city_id)
            );
        if (filtered.lines)
            filtered.lines = filtered.lines.filter((l) =>
                validCityIds.has(l.city_id)
            );
        if (filtered.sections)
            filtered.sections = filtered.sections.filter((s) =>
                validCityIds.has(s.city_id)
            );
        if (filtered.stations)
            filtered.stations = filtered.stations.filter((s) =>
                validCityIds.has(s.city_id)
            );
        if (filtered.section_lines)
            filtered.section_lines = filtered.section_lines.filter((sl) =>
                validCityIds.has(sl.city_id)
            );
        if (filtered.station_lines)
            filtered.station_lines = filtered.station_lines.filter((sl) =>
                validCityIds.has(sl.city_id)
            );
    }

    // -- Cascade from Systems --
    if (filtered.systems) {
        const validSystemIds = new Set(filtered.systems.map((s) => s.id));
        if (filtered.lines)
            filtered.lines = filtered.lines.filter((l) =>
                validSystemIds.has(l.system_id)
            );
    }

    // -- Cascade from Transport Modes --
    if (filtered.transport_modes) {
        const validModeIds = new Set(
            filtered.transport_modes.map((tm) => tm.id)
        );
        if (filtered.lines)
            filtered.lines = filtered.lines.filter((l) =>
                validModeIds.has(l.transport_mode_id)
            );
    }

    // -- Cascade from Lines --
    if (filtered.lines) {
        const validLineIds = new Set(filtered.lines.map((l) => l.id));
        if (filtered.section_lines)
            filtered.section_lines = filtered.section_lines.filter((sl) =>
                validLineIds.has(sl.line_id)
            );
        if (filtered.station_lines)
            filtered.station_lines = filtered.station_lines.filter((sl) =>
                validLineIds.has(sl.line_id)
            );
    }

    // -- Cascade from Sections --
    if (filtered.sections) {
        const validSectionIds = new Set(filtered.sections.map((s) => s.id));
        if (filtered.section_lines)
            filtered.section_lines = filtered.section_lines.filter((sl) =>
                validSectionIds.has(sl.section_id)
            );
    }

    // -- Cascade from Stations --
    if (filtered.stations) {
        const validStationIds = new Set(filtered.stations.map((s) => s.id));
        if (filtered.station_lines)
            filtered.station_lines = filtered.station_lines.filter((sl) =>
                validStationIds.has(sl.station_id)
            );
    }

    // 4. Reverse Cascade (Cleanup - Upwards)
    // Rimuoviamo le città che sono rimaste senza linee dopo il filtraggio
    if (filtered.lines && filtered.cities) {
        const activeCityIds = new Set(filtered.lines.map((l) => l.city_id));

        // Puliamo anche i sistemi già che ci siamo
        if (filtered.systems) {
            filtered.systems = filtered.systems.filter((s) =>
                activeCityIds.has(s.city_id)
            );
        }

        // Filtriamo le città
        filtered.cities = filtered.cities.filter((c) =>
            activeCityIds.has(c.id)
        );
    }

    return filtered;
}

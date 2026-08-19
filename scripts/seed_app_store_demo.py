#!/usr/bin/env python3
"""Temporarily seed RestoHub's simulator AsyncStorage for marketing captures.

This script only touches the manifest path explicitly passed on the command line.
It creates a byte-for-byte backup before replacing the catalog with a marketing
demo built from real Paris restaurant names and addresses. Ratings, visits,
notes and list membership remain explicitly fictitious demo data.
"""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


CATALOG_KEY = "@restohub_catalog_v1"
STAMP = "2026-08-12T00:00:00.000Z"


PLACES = [
    (
        "kodawari-tsukiji",
        "Kodawari Ramen Tsukiji",
        "asiatique",
        "12 rue Richelieu, 75001 Paris",
        48.8643846,
        2.3362784,
        "ramen.png",
    ),
    ("sushi-b", "Sushi B", "sushi", "5 rue Rameau, 75002 Paris", 48.8677331, 2.3374425, "sushi.jpg"),
    (
        "pny-oberkampf",
        "PNY Oberkampf",
        "burger",
        "96 rue Oberkampf, 75011 Paris",
        48.8656521,
        2.3777638,
        "burger.jpg",
    ),
    (
        "surpriz-oberkampf",
        "Sürpriz Oberkampf",
        "kebab",
        "110 rue Oberkampf, 75011 Paris",
        48.8659664,
        2.3790391,
        "kebab.jpg",
    ),
    (
        "dalmata-tiquetonne",
        "Dalmata Tiquetonne",
        "pizzeria",
        "8 rue Tiquetonne, 75002 Paris",
        48.8645378,
        2.3493930,
        "pizza.jpg",
    ),
    (
        "cafe-kitsune-palais-royal",
        "Café Kitsuné – Palais Royal",
        "cafe",
        "51 Galerie de Montpensier, 75001 Paris",
        48.8655512,
        2.3373765,
        "matcha.jpg",
    ),
]


REFERENCE_DETAILS = {
    "kodawari-tsukiji": {
        "description": "Une adresse ramen enregistrée pour une prochaine sortie parisienne.",
        "tags": ["ramen", "japonais", "à découvrir"],
        "priceBand": "21-30",
    },
    "sushi-b": {
        "description": "Un comptoir sushi ajouté à la liste des grandes occasions.",
        "tags": ["sushi", "omakase", "occasion"],
        "priceBand": "21-30",
    },
    "pny-oberkampf": {
        "description": "Une adresse burger repérée dans le quartier Oberkampf.",
        "tags": ["burger", "oberkampf", "entre amis"],
        "priceBand": "11-20",
    },
    "surpriz-oberkampf": {
        "description": "Un döner berlinois ajouté aux envies de street-food.",
        "tags": ["kebab", "berlinois", "street-food"],
        "priceBand": "11-20",
    },
    "dalmata-tiquetonne": {
        "description": "Une pizzeria parisienne gardée pour un dîner à partager.",
        "tags": ["pizza", "italien", "à deux"],
        "priceBand": "11-20",
    },
    "cafe-kitsune-palais-royal": {
        "description": "Une pause café et matcha au cœur du Palais Royal.",
        "tags": ["café", "matcha", "goûter"],
        "priceBand": "11-20",
    },
}


def build_catalog(photo_dir: Path | None = None) -> dict:
    places = []
    references = []
    for place_id, name, category, address, latitude, longitude, photo_name in PLACES:
        location = {"latitude": latitude, "longitude": longitude, "address": address}
        photo_path = (photo_dir / photo_name).resolve() if photo_dir else None
        if photo_path and not photo_path.is_file():
            raise SystemExit(f"Photo not found: {photo_path}")
        images = [photo_path.as_uri()] if photo_path else []
        places.append(
            {
                "id": place_id,
                "name": name,
                "category": category,
                "address": address,
                "location": location,
                "createdAt": STAMP,
                "updatedAt": STAMP,
            }
        )
        references.append(
            {
                "id": f"personal:{place_id}",
                "placeId": place_id,
                "origin": {"kind": "personal"},
                "identitySnapshot": {
                    "name": name,
                    "category": category,
                    "address": address,
                    "location": location,
                },
                **REFERENCE_DETAILS[place_id],
                "images": images,
                "createdAt": STAMP,
                "updatedAt": STAMP,
            }
        )

    # Imported references make the social/list provenance visible without using
    # a real person's information.
    references.extend(
        [
            {
                **references[4],
                "id": "imported:lina:dalmata-tiquetonne",
                "origin": {
                    "kind": "imported",
                    "collectionId": "shared-lina",
                    "ownerName": "Lina",
                    "ownerId": "demo-lina",
                    "remoteRestaurantId": "lina-dalmata-tiquetonne",
                },
            },
            {
                **references[5],
                "id": "imported:yasmine:cafe-kitsune-palais-royal",
                "origin": {
                    "kind": "imported",
                    "collectionId": "shared-yasmine",
                    "ownerName": "Yasmine",
                    "ownerId": "demo-yasmine",
                    "remoteRestaurantId": "yasmine-cafe-kitsune-palais-royal",
                },
            },
        ]
    )

    collections = [
        {
            "id": "list-testing",
            "name": "À tester",
            "emoji": "Sparkles",
            "description": "Les prochaines pépites à découvrir",
            "kind": "personal",
            "isVisible": True,
            "createdAt": STAMP,
        },
        {
            "id": "list-korean",
            "name": "Japon à Paris",
            "emoji": "Noodles",
            "description": "Ramen, sushi et pauses matcha",
            "kind": "personal",
            "isVisible": True,
            "createdAt": STAMP,
        },
        {
            "id": "list-burgers",
            "name": "Street-food",
            "emoji": "Burger",
            "description": "Burgers et döner à découvrir",
            "kind": "personal",
            "isVisible": True,
            "createdAt": STAMP,
        },
        {
            "id": "shared-lina",
            "name": "Les spots de Lina",
            "emoji": "Heart",
            "description": "Ses bonnes adresses parisiennes",
            "kind": "imported",
            "ownerName": "Lina",
            "ownerId": "demo-lina",
            "remoteCollectionId": "lina-paris",
            "revision": 1,
            "isVisible": True,
            "importedAt": STAMP,
            "createdAt": STAMP,
        },
        {
            "id": "shared-yasmine",
            "name": "Goûters de Yasmine",
            "emoji": "CakeSlice",
            "description": "Cafés calmes et douceurs",
            "kind": "imported",
            "ownerName": "Yasmine",
            "ownerId": "demo-yasmine",
            "remoteCollectionId": "yasmine-sweet",
            "revision": 1,
            "isVisible": True,
            "importedAt": STAMP,
            "createdAt": STAMP,
        },
    ]

    memberships = [
        {"collectionId": "list-testing", "referenceId": "personal:pny-oberkampf"},
        {"collectionId": "list-testing", "referenceId": "personal:surpriz-oberkampf"},
        {"collectionId": "list-testing", "referenceId": "personal:dalmata-tiquetonne"},
        {"collectionId": "list-korean", "referenceId": "personal:kodawari-tsukiji"},
        {"collectionId": "list-korean", "referenceId": "personal:sushi-b"},
        {"collectionId": "list-korean", "referenceId": "personal:cafe-kitsune-palais-royal"},
        {"collectionId": "list-burgers", "referenceId": "personal:pny-oberkampf"},
        {"collectionId": "list-burgers", "referenceId": "personal:surpriz-oberkampf"},
        {"collectionId": "shared-lina", "referenceId": "imported:lina:dalmata-tiquetonne"},
        {"collectionId": "shared-yasmine", "referenceId": "imported:yasmine:cafe-kitsune-palais-royal"},
    ]

    visits = [
        {
            "id": "visit-kodawari-tsukiji",
            "placeId": "kodawari-tsukiji",
            "visitedAt": "2026-08-02T19:30:00.000Z",
            "rating": 4.5,
            "wouldReturn": True,
            "dishes": ["Ramen du jour"],
            "amount": 24,
            "companions": "Lina",
            "notes": "Donnée de démonstration pour illustrer le journal personnel.",
            "imageUris": references[0]["images"],
            "createdAt": STAMP,
            "updatedAt": STAMP,
        },
        {
            "id": "visit-sushi-b",
            "placeId": "sushi-b",
            "visitedAt": "2026-07-22T20:00:00.000Z",
            "rating": 5,
            "wouldReturn": True,
            "dishes": ["Menu dégustation"],
            "amount": 30,
            "companions": "À deux",
            "notes": "Donnée de démonstration — avis personnel fictif.",
            "imageUris": references[1]["images"],
            "createdAt": STAMP,
            "updatedAt": STAMP,
        },
        {
            "id": "visit-pny-oberkampf",
            "placeId": "pny-oberkampf",
            "visitedAt": "2026-07-10T12:30:00.000Z",
            "rating": 4,
            "wouldReturn": True,
            "dishes": ["Burger du moment"],
            "amount": 15,
            "notes": "Donnée de démonstration — avis personnel fictif.",
            "imageUris": references[2]["images"],
            "createdAt": STAMP,
            "updatedAt": STAMP,
        },
    ]

    return {
        "schemaVersion": 1,
        "places": places,
        "references": references,
        "collections": collections,
        "memberships": memberships,
        "duplicateDecisions": [],
        "duplicateReviews": [],
        "visits": visits,
        "importReceipts": [],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    parser.add_argument("backup", type=Path)
    parser.add_argument("--photo-dir", type=Path)
    args = parser.parse_args()

    if not args.manifest.is_file():
        raise SystemExit(f"Manifest not found: {args.manifest}")

    shutil.copy2(args.manifest, args.backup)
    storage = json.loads(args.manifest.read_text(encoding="utf-8"))
    storage[CATALOG_KEY] = json.dumps(build_catalog(args.photo_dir), ensure_ascii=False, separators=(",", ":"))
    args.manifest.write_text(json.dumps(storage, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Seeded {args.manifest}")
    print(f"Backup {args.backup}")


if __name__ == "__main__":
    main()

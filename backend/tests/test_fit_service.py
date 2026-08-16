import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base
from app.schemas.fit import BodyMeasurements, InventoryAdjustment
from app.services.fit_service import adjust_inventory, list_variants, recommend_variants, seed_catalogue


class FitServiceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite+pysqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        with self.Session() as session:
            seed_catalogue(session)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_recommendations_exclude_out_of_stock_variants(self) -> None:
        with self.Session() as session:
            results = recommend_variants(
                session,
                BodyMeasurements(chest=99, waist=86, hip=100, shoulder=44, sleeve=61),
            )
        self.assertEqual([result.variant.sku for result in results], ["OX-BLU-M", "TW-SND-M"])
        self.assertEqual(results[0].result, "Best fit")

    def test_inventory_adjustment_changes_visibility_and_version(self) -> None:
        with self.Session() as session:
            variant = next(item for item in list_variants(session) if item.sku == "OX-BLU-M")
            updated = adjust_inventory(
                session,
                variant.id,
                InventoryAdjustment(delta=-7, expected_version=variant.version),
            )
            available_skus = [item.sku for item in list_variants(session, available_only=True)]

        self.assertEqual(updated.stock, 0)
        self.assertEqual(updated.version, variant.version + 1)
        self.assertNotIn("OX-BLU-M", available_skus)


if __name__ == "__main__":
    unittest.main()

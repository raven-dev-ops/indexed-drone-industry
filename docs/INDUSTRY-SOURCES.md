# Refreshing the industry directory

The application builds from `data/industry.json`. The import reviewer compares selected upstream rows with that file and writes a report to stdout. It does not download data, edit the published index, or promote upstream rows into production.

```sh
node scripts/import-industry.mjs \
  --faa faa-remote-id.json \
  --lac MINFAC_LAC.csv \
  --africa africa-facilities.csv \
  --china china-table5.csv > industry-review.json
```

Use any subset of the four inputs. Keep raw inputs and the generated review report outside Git. The report includes input SHA-256 hashes, matching counts, proposed field changes, and unmatched or ambiguous rows. Review each candidate against the source, then update the published record and its source locator only when warranted.

| Input | Source and preparation |
| --- | --- |
| `--faa` | Save the JSON from the [Drone Authority Remote ID snapshot page](https://droneauthority.org/data/faa-remote-id-declarations). The original selection used the September 26, 2026 CC BY 4.0 snapshot with 477 rows. Verify attribution and the individual FAA declaration link. |
| `--lac` | Download `MINFAC_LAC.csv` from the [USGS Latin America and Caribbean facilities release](https://doi.org/10.5066/F7MG7MM6). Pass the original Windows-1252 CSV. This public-domain dataset describes facilities as of 2014. |
| `--africa` | Download and extract `Africa_GIS.gdb.zip` from the [USGS Africa geospatial release](https://doi.org/10.5066/P97EQWXP), marked CC0 1.0. Export the `AFR_Mineral_Facilities` attribute table to UTF-8 CSV with its original column names. For example, `ogr2ogr -f CSV africa-facilities.csv Africa_GIS.gdb AFR_Mineral_Facilities`. |
| `--china` | From [USGS Open-File Report 2026–1018, Table 5](https://pubs.usgs.gov/publication/ofr20261018/full#ofr20261018-t05), export data rows with numeric WGS84 coordinates to UTF-8 CSV. Map the facility, commodity, province, latitude and longitude columns to `name,commodity,province,lat,lon`. Remove note superscripts and skip section headings. The table summarizes 2023 facilities. |

The reviewer matches FAA declarations by tracking number, Latin American facilities by `ROWID`, African facilities by `FeatureUID` with name and location to resolve repeated keys, and Chinese facility rows by name. It compares names and coordinates rounded to four decimal places. Historical activity and location-accuracy fields remain visible as evidence for review. Confirm current operating status with a current operator or agency source before changing it. Preserve curated names, descriptions, precision, relationships and independent sources when appropriate.

The FAA section also lists source make labels absent from the index. A make label can be a brand, model, alias or generic string. Verify that it identifies a distinct organization before adding an entry. Retain the CC BY 4.0 attribution to Drone Authority in any adapted record.

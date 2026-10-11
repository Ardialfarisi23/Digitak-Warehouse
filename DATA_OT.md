# DATA_OT.md (READ-ONLY)

## B. Data aktual

### Q1. Semua gudang
| gudang_id | nama_gudang | tipe | is_aktif | is_internal | project_id | OT? |
|---|---|---|---|---|---|---|
| 1 | Gudang Rancamanyar | tetap | true | true |  |  |
| 2 | Gudang Ciamis | tetap | true | true |  |  |
| 7 | Gudang Old Trafford | tetap | true | true |  | YA |

### Q2. Stok OT (gudang_id=7)
| total_baris | baris_aktif(qty>0) | barang_unik | total_qty |
|---|---|---|---|
| 153 | 152 | 39 | 36056.00 |


### Q3. Stok OT per zona
| zona_id | kode_zona | COUNT | SUM(qty) |
|---|---|---|---|
| 25 | A | 39 | 9014.00 |
| 26 | B | 38 | 9014.00 |
| 27 | C | 38 | 9014.00 |
| 28 | D | 38 | 9014.00 |

### Q4. Stok OT per kondisi dan per project_id
| kondisi | project_id | COUNT | SUM(qty) |
|---|---|---|---|
| baik | NULL | 153 | 36056.00 |

### Q5. Gudang aktif selain OT - zona, stok
| gudang_id | nama | jml_zona | zona_list(kode:kap) | total_baris_stok | total_qty | stok_zona_null | stok_zona_terisi |
|---|---|---|---|---|---|---|---|
| 1 | Gudang Rancamanyar | 4 | A,B,C,D | 152 | 36056.00 | 0 | 152 |
| 2 | Gudang Ciamis | 4 | A:200,B,C,D | 155 | 36052.00 | 1 | 154 |

### Q6. Bentrok kombinasi (OT qty>0) vs gudang tujuan (join via kode_zona)
| gudang_tujuan | baris_OT_yang_sudah_ada | baris_OT_kode_zona_tidak_ada_di_tujuan | baris_OT_zona_id_NULL |
|---|---|---|---|
| 1 (Gudang Rancamanyar) | 152 | 0 | 0 |
| 2 (Gudang Ciamis) | 152 | 0 | 0 |

### Q7. Duplikat laten di gudang tujuan (grup > 1)
| gudang_id | nama | grup_duplikat |
|---|---|---|
| 1 | Gudang Rancamanyar | 0 |
| 2 | Gudang Ciamis | 0 |

### Q8. Dokumen merujuk OT
#### surat_jalan (asal/tujuan = OT) per status
| status | COUNT |
|---|---|

#### count per tabel lain (merujuk OT)
| tabel | COUNT |
|---|---|
| surat_jalan_transit | 0 |
| boq_item(gudang_tujuan_id=OT) | 0 |
| user_gudang | 0 |
| personil(gudang_id=OT) | 1 |
| kendaraan(gudang_id=OT) | 0 |
| zona_gudang | 4 |

### Q9. stok_ledger
- baris ledger untuk barang_id yang ada di stok OT: 459
- total stok_ledger: 461
- tanpa dokumen sumber (surat_jalan_item_id NULL AND return_transaction_id NULL): 459

### Q10. Info koneksi (tanpa password)
- user=postgres host=localhost port=5432 db=digitak_warehouse
- pg_dump: tidak ditemukan

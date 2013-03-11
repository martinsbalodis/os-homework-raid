Dažādu RAID disku masīvu implementāciju vizualizācijas, kas demonstrē gan datņu ierakstīšanu, gan nolasīšanu no RAID datu masīviem un RAID masīvu atjaunošanu vienas komponentes sabojāšanās gadījumā.


## Neliels klašu apraksts

R - Galvenais konteineris. Satur saites uz visiem objektiem.

Disk - disks

Raid - Disku masīvs. Ielādešanās brīdī, tas ielādē atbilstošā draivera funkcijas

DiskConnection - savienojums starp raid masīvu un disku

import { LocationDTO } from './../DTO/location.dto';
import { LocationService } from './location.service';
import { DbConstants } from './../consts/db.consts';
import { Injectable, Inject } from '@nestjs/common';
import { Repository } from 'typeorm';
import { POI } from '../entity/poi.entity';
import { LoggerFactory } from '../utils/LoggerFactory';
const logger = LoggerFactory(module);

@Injectable()
export class PoiService {
    private readonly MINIMUM_DISTANCE_IN_METERS_TO_VISIT = 5;

    constructor(@Inject(DbConstants.POI_REPOSITORY) private readonly poiRepo: Repository<POI>,
                private readonly locationService: LocationService) { }

    async getAll(): Promise<POI[]> {
        return this.poiRepo.find();
    }

    async createNewPoi(title: string, description: string, lat: number, long: number): Promise<POI> {
        const poi = new POI();
        poi.title = title;
        poi.description = description;
        poi.long = long;
        poi.lat = lat;

        return this.poiRepo.save(poi);
    }

    public async getNearestPois(myLocation: LocationDTO, withinRadiusInMeters: number): Promise<POI[]> {
        const listOfPois = await this.getAll();

        const filteredArray = listOfPois.filter((poi) => {
            const poiLocation = new LocationDTO(poi.lat, poi.long);

            const distance =
                Math.abs(this.locationService.calculateDistanceInMeters(myLocation, poiLocation));

            return distance <= withinRadiusInMeters;
        });

        const sortedArray = filteredArray.sort((n1, n2) => {
            const n1Location = new LocationDTO(n1.lat, n1.long);
            const n2Location = new LocationDTO(n2.lat, n2.long);

            return this.locationService.calculateDistanceInMeters(myLocation, n1Location) -
                    this.locationService.calculateDistanceInMeters(myLocation, n2Location);
        });

        return sortedArray;
    }

    public async canVisitPOI(id: string, userLocation: LocationDTO): Promise<boolean> {
        const poi = await this.poiRepo.findOne(id);

        if (!poi) {
            logger.error('POI not found');
            return false;
        }

        const poiLocation: LocationDTO = { long: poi.long, lat: poi.lat };

        const distanceBetweenUserAndPOI = this.locationService.calculateDistanceInMeters(userLocation, poiLocation);

        return distanceBetweenUserAndPOI <= this.MINIMUM_DISTANCE_IN_METERS_TO_VISIT;
    }

    public async rankPOI(id: string, rank: number): Promise<POI> {
        const poi = await this.poiRepo.findOne(id);

        if (!poi) {
            return {} as POI;
        }

        poi.ranking = poi.ranking != -1 ? (poi.ranking + rank) / 2 : rank;
        poi.ranking = poi.ranking > 5 ? 5 : poi.ranking;
        poi.ranking = poi.ranking < 0 ? 0 : poi.ranking;
        return this.poiRepo.save(poi);
    }
}

import {fakeAsync, TestBed, tick} from '@angular/core/testing';

import {ProjectPlanningSandboxService} from './project-planning-sandbox.service';
import {HttpClientTestingModule} from "@angular/common/http/testing";
import {
    ActualDataService,
    ApprovalService,
    CurrencyService,
    DefaultActualDataService,
    DefaultApprovalService,
    DefaultCSSPlanningService,
    DefaultCurrencyService,
    DefaultSubprojectService,
    ProjectPlanningService,
    Subproject,
    SubprojectService,
    SubProjectVersion
} from "../../shared/business-domain";
import {LoadingIndicatorService} from "../../shared/loading-indicator";
import {SubprojectSanboxService} from "./components/subproject/subproject-sanbox.service";
import {MessageDialogService} from "../../shared/dialog";
import {SnackBarService} from "../../shared/notification";
import {ReadWriteHelper} from "../../shared/utils";
import {Store, StoreModule} from "@ngrx/store";
import {ProjectSandboxService} from "./components/project/project-sandbox.service";
import {DataPickerService, DefaultDataPickerService} from "../../shared/data-picker";
import {ProjectPlanningStateModule} from "./+state/project-planning-state.module";
import {CoverageSpecialSalesMaterialModule} from "../../shared/material";
import {of} from "rxjs";
import {MockDataService} from "../../../mock/mock-services/mockDataService.service";
import {ErrorHandlerService, DefaultErrorHandlerService} from "../../shared/error-handler";


describe('ProjectPlanningSandboxService', () => {

    let readWriteHelper: ReadWriteHelper;
    let projectPlanningSandboxService: ProjectPlanningSandboxService;
    let projectPlanningService: ProjectPlanningService;
    let projectSandboxService: ProjectSandboxService;
    let subprojectService: SubprojectService;
    let actualDataService: ActualDataService;
    let subprojectSanboxService: SubprojectSanboxService;
    let approvalService: ApprovalService;
    let currencyService: CurrencyService;
    let store: Store<any>;
    let mockData: MockDataService;
    let getCurentForecastExchangeRatesSpy: any;

    let getProjectDataSpy: any;
    let getProjectDataFromStore : any;
    let getProjectNagivationItemsSpy: any;
    let getActualDataSpy: any;
    let getActualDataSumSpy : any;
    let getApprovalPermissionsSpy: any;
    let getProjectSubprojectsSpy: any;
    let getExchangeRatesSpy: any;


    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [
                HttpClientTestingModule,
                StoreModule.forRoot({}),
                CoverageSpecialSalesMaterialModule,
                ProjectPlanningStateModule
            ],
            providers: [
                ReadWriteHelper,
                {provide: SubprojectService, useClass: DefaultSubprojectService},
                {provide: ProjectPlanningService, useClass: DefaultCSSPlanningService},
                {provide: DataPickerService, useClass: DefaultDataPickerService},
                {provide: CurrencyService, useClass: DefaultCurrencyService},
                {provide: ApprovalService, useClass: DefaultApprovalService},
                {provide: ActualDataService, useClass: DefaultActualDataService},
                {provide: ErrorHandlerService, useClass: DefaultErrorHandlerService},
                LoadingIndicatorService,
                SubprojectSanboxService,
                MessageDialogService,
                SnackBarService,
                LoadingIndicatorService,
                ProjectSandboxService,
                ProjectPlanningSandboxService,
                MockDataService,
                Store

            ]
        });

        projectPlanningSandboxService = TestBed.get(ProjectPlanningSandboxService);
        projectPlanningService = TestBed.get(ProjectPlanningService);
        projectSandboxService = TestBed.get(ProjectSandboxService);
        subprojectSanboxService = TestBed.get(SubprojectSanboxService);
        subprojectService = TestBed.get(SubprojectService);
        actualDataService = TestBed.get(ActualDataService);
        approvalService = TestBed.get(ApprovalService);
        currencyService = TestBed.get(CurrencyService);
        mockData = TestBed.get(MockDataService);
        readWriteHelper = TestBed.get(ReadWriteHelper);
        store = TestBed.get(Store);

        getProjectDataSpy = spyOn(projectPlanningService, 'getProjectData').and.returnValue(of(mockData.getProjectData()));
        getProjectDataFromStore = spyOn(projectPlanningSandboxService, 'getProjectDataFromStore').and.returnValue(of(mockData.getProjectData()));
        getProjectNagivationItemsSpy = spyOn(projectPlanningService, 'getProjectNagivationItems').and.returnValue(of(mockData.getProjectNavigationItem()));
        getActualDataSpy = spyOn(actualDataService, 'getActualData').and.returnValue(of([mockData.getSubprojectActualData()]));
        getActualDataSumSpy = spyOn(actualDataService, 'getSumaryOfActualData').and.returnValue(of([mockData.getActualData()]));
        getApprovalPermissionsSpy = spyOn(approvalService, 'getApprovalPermissions').and.returnValue(of(mockData.getApprovalPermissions()));
        getProjectSubprojectsSpy = spyOn(subprojectService, 'getProjectSubprojects').and.returnValue(of([mockData.getSubProjectData()]));
        getExchangeRatesSpy = spyOn(currencyService, 'getExchangeRates').and.returnValue(of(mockData.getCurrencyRates()));
        getCurentForecastExchangeRatesSpy = spyOn(currencyService, 'getCurentForecastExchangeRates').and.returnValue(of(mockData.getCurrencyRates()));

    });

    it('store to be defined', () => {
        expect(store).toBeDefined();
    });

    it('should be created', () => {
        const service: ProjectPlanningSandboxService = TestBed.get(ProjectPlanningSandboxService);
        expect(service).toBeTruthy();
    });

    it('test getProjectData is called and returns data for project level', (done) => {
        const projectBMNumber = 'BM-00006037';

        projectPlanningSandboxService.getProjectData(projectBMNumber);

        projectPlanningSandboxService.data.project$.subscribe(result => {
            expect(getProjectDataSpy).toHaveBeenCalled();
            expect(result).toEqual(mockData.getProjectData());
            done();
        });
    });

    it('test getProjectData is called and returns project navigation data', (done) => {
        const projectBMNumber = 'BM-00006037';

        projectPlanningSandboxService.getProjectData(projectBMNumber);

        projectPlanningSandboxService.data.projectNavigation$.subscribe(result => {
            expect(getProjectNagivationItemsSpy).toHaveBeenCalled();
            expect(result).toEqual(mockData.getProjectNavigationItem());
            done();
        });
    });

    it('test getProjectData is called and returns subproject data', (done) => {
        const projectBMNumber = 'BM-00006037';

        projectPlanningSandboxService.getProjectData(projectBMNumber);

        projectPlanningSandboxService.data.subProjectVersions$.subscribe((result:SubProjectVersion[]) => {
            expect(getProjectSubprojectsSpy).toHaveBeenCalled();
            let subProjectVersions: SubProjectVersion [] = [mockData.getSubProjectData()].map((subproject: Subproject) => {
                let subprojectVersion = new SubProjectVersion();
                subprojectVersion.id = subproject.mcrMasterData.mcrSubProjectId;
                subprojectVersion.activeVersion = 0;
                subprojectVersion.versionSubprojectMap.set(0, subproject);

                return subprojectVersion;
            });
            expect(result[0].versionSubprojectMap.get(0).cssMasterData).toEqual(subProjectVersions[0].versionSubprojectMap.get(0).cssMasterData);
            expect(result[0].versionSubprojectMap.get(0).mcrMasterData).toEqual(subProjectVersions[0].versionSubprojectMap.get(0).mcrMasterData);
            expect(result[0].versionSubprojectMap.get(0).latestUpdDate).toEqual(subProjectVersions[0].versionSubprojectMap.get(0).latestUpdDate);
            expect(result[0].versionSubprojectMap.get(0).lastChangeDate).toEqual(subProjectVersions[0].versionSubprojectMap.get(0).lastChangeDate);
            expect(result[0].versionSubprojectMap.get(0).updUser).toEqual(subProjectVersions[0].versionSubprojectMap.get(0).updUser);
            done();
        });

    });

    it('test getProjectData is called and returns sum of actual data', (done) => {
        const projectBMNumber = 'BM-00006037';

        projectPlanningSandboxService.getProjectData(projectBMNumber);

        projectSandboxService.data.actualDataSum$.subscribe(result => {
            expect(getActualDataSpy).toHaveBeenCalled();
            expect(result).toEqual([mockData.getActualData()]);
            done();
        });

    });

    it('test getProjectData is called and returns actual data for subproject level', (done) => {
        const projectBMNumber = 'BM-00006037';

        projectPlanningSandboxService.getProjectData(projectBMNumber);

        projectPlanningSandboxService.data.subProjectVersions$.subscribe((result: SubProjectVersion[]) => {
            expect(getActualDataSpy).toHaveBeenCalled();
            let actualOtpValue = null;
            let actualPAOValue = null;
            let actualCost = null;
            let year = mockData.getSubprojectActualData().actualData[0].year;
            result[0].versionSubprojectMap.get(0).subProjectData.forEach(subprojectData => {
                if (year == subprojectData.year) {
                    actualCost = subprojectData.costCompareValue;
                    actualOtpValue = subprojectData.otpCompareValue;
                    actualPAOValue = subprojectData.paoCompareValue;
                }
            });

            expect(actualCost).toEqual(mockData.getSubprojectActualData().actualData[0].actualCostValue);
            expect(actualOtpValue).toEqual(mockData.getSubprojectActualData().actualData[0].actualOtpValue);
            expect(actualPAOValue).toEqual(mockData.getSubprojectActualData().actualData[0].actualPaoValue);
            done();
        });

    });

    it('test updateContractualAgreedValues can overwrite project values to subprojects, forecast rates are not in store',  fakeAsync(() => {
        let project = mockData.getProjectData();
        project.subProjects = [mockData.getSubProjectData()];
        const subProjectVersions: SubProjectVersion [] = [mockData.getSubProjectData()].map((subproject: Subproject) => {
            let subprojectVersion = new SubProjectVersion();
            subprojectVersion.id = subproject.mcrMasterData.mcrSubProjectId;
            subprojectVersion.activeVersion = 0;
            subprojectVersion.versionSubprojectMap.set(0, subproject);

            return subprojectVersion;
        });
        spyOn(projectPlanningSandboxService, 'getForecastExRatesFromStore').and.returnValue(of(null));
        spyOn(projectPlanningSandboxService, 'getSubprojectVersionFromStore').and.returnValue(of(subProjectVersions));

        projectPlanningSandboxService.updateContractualAgreedValues(project);

        const currencyList = [project.selectedCurrency.curId];
        project.subProjects.forEach(subproject => {
            if (currencyList.indexOf(subproject.cssMasterData.currencyId) < 0) {
                currencyList.push(subproject.cssMasterData.currencyId);
            }
        });

        tick(500);
        projectPlanningSandboxService.data.subProjectVersions$.subscribe((result: SubProjectVersion[]) => {
            expect(getCurentForecastExchangeRatesSpy).toHaveBeenCalledWith(currencyList);
            expect(result[0].versionSubprojectMap.get(0).cssMasterData.contractualOTP).toEqual(2000);
            expect(project.contractualOTP).toEqual(null);
        });
    }));


});

import { BaseService } from '@renderer/services/base.service';
import { HttpService } from '@renderer/services/http.service';
import { Injectable } from '@angular/core';
import { ResponseModel } from '@renderer/model/response.model';
import { RequestModel } from '@renderer/model/request.model';
import { ConfigModel } from '@renderer/model/config.model';
import { TypeEnum } from '@renderer/enum/type.enum';
import { StringUtils } from '@renderer/utils/string.utils';
import { DatabaseModel } from '@renderer/model/database.model';
import { DatabaseEnum } from '@renderer/enum/database.enum';
import { PropertyModel } from '@renderer/model/property.model';
import { SshService } from '@renderer/services/ssh.service';
import { BasicService } from '@renderer/services/system/basic.service';
import { ForwardService } from '@renderer/services/forward.service';
import { FilterModel } from '@renderer/model/filter.model';
import { FactoryService } from "@renderer/services/factory.service";
import { PrestoService } from "@renderer/services/presto.service";
import { MySQLService } from "@renderer/services/plugin/mysql.service";
import { PostgresqlService } from "@renderer/services/plugin/postgresql.service";

@Injectable()
export class MetadataService extends ForwardService implements BaseService {
  WORD = 'ENGINE';

  constructor(basicService: BasicService,
              factoryService: FactoryService,
              httpService: HttpService,
              sshService: SshService,
              prestoService: PrestoService,
              mysqlService: MySQLService,
              postgresqlService: PostgresqlService) {
    super(basicService, factoryService, httpService, sshService, prestoService, mysqlService, postgresqlService);
  }

  getResponse(request: RequestModel, sql?: string): Promise<ResponseModel> {
    return this.forward(request, sql);
  }

  getDiskUsedAndRatio(request: RequestModel, config: ConfigModel): Promise<ResponseModel> {
    let sql;
    const baseConfig = this.factoryService.forward(request.config.type);
    switch (config.type) {
      case TypeEnum.disk:
        sql = baseConfig.diskUsedRatio;
        break;
      case TypeEnum.server:
        sql = baseConfig.databaseDiskUsedRatio;
        break;
      case TypeEnum.database:
        sql = StringUtils.format(baseConfig.tableDiskUsedRatio, [config.key]);
        break;
      case TypeEnum.table:
      case TypeEnum.column:
        sql = StringUtils.format(baseConfig.columnDiskUsedRatio, [config.database, config.key, 100]);
        break;
    }
    return this.getResponse(request, sql);
  }

  getChild(request: RequestModel, config: ConfigModel, filter?: FilterModel): Promise<ResponseModel> {
    const baseConfig = this.factoryService.forward(request.config.type);
    let sql;
    switch (config.type) {
      case TypeEnum.server:
        if (filter) {
          if (filter.precise) {
            sql = StringUtils.format(baseConfig.databaseItemsFilterPrecise, [filter.value]);
          } else {
            sql = StringUtils.format(baseConfig.databaseItemsFilterFuzzy, [filter.value]);
          }
        } else {
          sql = baseConfig.databaseItems;
        }
        break;
      case TypeEnum.database:
        if (filter) {
          if (filter.precise) {
            sql = StringUtils.format(baseConfig.tableItemsFilterPrecise, [config.key, filter.value]);
          } else {
            sql = StringUtils.format(baseConfig.tableItemsFilterFuzzy, [config.key, filter.value]);
          }
        } else {
          sql = StringUtils.format(baseConfig.tableItems, [config.key]);
        }
        break;
      case TypeEnum.table:
        sql = StringUtils.format(baseConfig.columnItems, [config.database, config.key]);
        break;
    }
    return this.getResponse(request, sql);
  }

  getInfo(request: RequestModel) {
    const sql = this.factoryService.forward(request.config.type).serverInfo;
    return this.getResponse(request, sql);
  }

  createDatabase(request: RequestModel, database: DatabaseModel): Promise<ResponseModel> {
    const sql = this.factoryService.forward(request.config.type).databaseCreate;
    const prefix = StringUtils.format(sql, [database.name]);
    let suffix;
    switch (database.type) {
      case DatabaseEnum.none:
        suffix = '';
        break;
      case DatabaseEnum.atomic:
        suffix = this.builderDatabaseAtomic(database);
        break;
      case DatabaseEnum.lazy:
        suffix = this.builderDatabaseLazy(database);
        break;
      case DatabaseEnum.mysql:
      case DatabaseEnum.materialized_mysql:
      case DatabaseEnum.materialized_postgresql:
        suffix = this.builderDatabaseMySQL(database);
        break;
    }

    if (request.config.type === DatabaseEnum.mysql) {
      if (database.characterAndCollationConfigure.enable) {
        if (database.characterAndCollationConfigure.characterSetConfigure.enable
          && StringUtils.isNotEmpty(database.characterAndCollationConfigure.characterSetConfigure.value)) {
          suffix += StringUtils.format(` CHARACTER SET '{0}'`,
            [database.characterAndCollationConfigure.characterSetConfigure.value]);
        }
        if (database.characterAndCollationConfigure.collationConfigure.enable
          && StringUtils.isNotEmpty(database.characterAndCollationConfigure.collationConfigure.value)) {
          suffix += StringUtils.format(` COLLATE '{0}'`,
            [database.characterAndCollationConfigure.collationConfigure.value]);
        }
      }
    }

    return this.getResponse(request, StringUtils.format('{0} {1}', [prefix, suffix]));
  }

  delete(request: RequestModel, value: string): Promise<ResponseModel> {
    const sql = StringUtils.format('DROP DATABASE {0}', [value]);
    return this.getResponse(request, sql);
  }

  getDatabaseDDL(request: RequestModel, value: string): Promise<ResponseModel> {
    const sql = StringUtils.format(this.factoryService.forward(request.config.type).showCreateDatabase, [value]);
    return this.getResponse(request, sql);
  }

  /**
   * Build the database DDL for atomic
   * <p>
   *   example: CREATE DATABASE xxx ENGINE Atomic
   * </p>
   *
   * @param value database configure
   * @returns suffix ddl
   */
  private builderDatabaseAtomic(value): string {
    return StringUtils.format('{0} = {1}', [this.WORD, value.type]);
  }

  /**
   * Build the database DDL for lazy
   * <p>
   *   example: CREATE DATABASE xxx ENGINE Lazy(xxx)
   * </p>
   *
   * @param value database configure
   * @returns suffix ddl
   */
  private builderDatabaseLazy(value): string {
    return StringUtils.format('{0} = {1}({2})', [this.WORD, value.type, value.property.timeSeconds]);
  }

  /**
   * Build the database DDL for mysql and MaterializedMySQL
   * <p>
   *   example: CREATE DATABASE xxx ENGINE MaterializedMySQL('host:port', ['database' | database], 'user', 'password')
   * </p>
   *
   * @param value database configure
   * @returns suffix ddl
   */
  private builderDatabaseMySQL(value): string {
    const map = this.flatProperty(value.property.properties);
    let response;
    if (StringUtils.isEmpty(map.get('database'))) {
      response = StringUtils.format('{0} = {1}({2}, {3}, {4})', [this.WORD, value.type,
        StringUtils.format('{0}:{1}', [map.get('host'), map.get('port')]),
        map.get('username'),
        map.get('password')]);
    } else {
      response = StringUtils.format(`{0} = {1}('{2}', '{3}', '{4}', '{5}')`, [this.WORD, value.type,
        StringUtils.format('{0}:{1}', [map.get('host'), map.get('port')]),
        map.get('database'),
        map.get('username'),
        map.get('password')]);
    }
    return response;
  }

  private flatProperty(properties: PropertyModel[]): Map<string, string> {
    const map = new Map<string, string>();
    properties.forEach(p => map.set(p.name, p.value));
    return map;
  }
}

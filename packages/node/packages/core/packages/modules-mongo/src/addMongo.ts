import { Container } from 'inversify'

import { ArchivistContainerModule } from './Archivist'
import { DivinerContainerModule } from './Diviner'
import { JobQueueContainerModule } from './JobQueue'
import { ManagerContainerModule } from './Manager'
import { MongoSdkContainerModule } from './Mongo'

export const addMongo = (container: Container) => {
  container.load(MongoSdkContainerModule)
  container.load(ArchivistContainerModule)
  container.load(DivinerContainerModule)
  container.load(ManagerContainerModule)
  container.load(JobQueueContainerModule)
}

          { id: 'notifications', label: 'الإشعارات' },
        ]}
        className="mb-5"
      />

      {tab === 'overview' && <OverviewTab {...props} onOpenTask={() => setModal({ kind: 'task' })} />}
      {tab === 'tasks' && <TasksTab locations={props.locations} lawyers={props.lawyers} onEdit={(t) => setModal({ kind: 'editTask', data: t })} />}
      {tab === 'lawyers' && <LawyersTab lawyers={props.lawyers} onAdd={() => setModal({ kind: 'lawyer' })} onEdit={(l) => setModal({ kind: 'lawyer', data: l })} />}
      {tab === 'locations' && <LocationsTab locations={props.locations} onAdd={() => setModal({ kind: 'location' })} onEdit={(l) => setModal({ kind: 'location', data: l })} />}
      {tab === 'cases' && <CasesTab cases={props.cases} />}
      {tab === 'users' && props.permissions.manageUsers && <UsersTab currentUserId={props.session.userId} />}
      {tab === 'activity' && <ActivityTab initial={props.activity} />}
      {tab === 'notifications' && <NotificationsTab notifications={props.notifications} />}

      {/* Modals */}
      <TaskCreator
        open={modal?.kind === 'task'}
        onClose={() => setModal(null)}
        locations={props.locations}
        lawyers={props.lawyers.map((l) => ({ id: l.id, name: l.name, isPrincipal: l.isPrincipal }))}
        cases={props.cases}
      />
      <LawyerForm
        open={modal?.kind === 'lawyer'}
        onClose={() => setModal(null)}
        lawyer={
          modal?.kind === 'lawyer' && modal.data
            ? (() => {
                const l = modal.data as LawyerRow;
                return {
                  id: l.id,
                  fullName: l.name,
                  title: l.title,
                  phone: l.phone,
                  email: l.email,
                  googleEmail: null,
                  specialization: l.specialization,
                  bio: l.bio,
                  position: l.position,
                };
              })()
            : null
        }
      />
      <LocationForm
        open={modal?.kind === 'location'}
        onClose={() => setModal(null)}